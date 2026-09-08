import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAppSettings } from '../hooks/useAppSettings';
import type { PingResult, Incident, AlertConfig, PingFrequency, PingSite } from '../types';
import { PingResultCard } from './PingResultCard';
import { PingChatView } from './PingChatView';
import { Spinner } from './Spinner';
import {
    ArrowLeft, Bell, Clock, Globe, ShieldCheck, Share2, Check,
    AlertTriangle, Send, Trash2, RefreshCw, Sliders, ExternalLink, X
} from 'lucide-react';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../src/firebase';
import { Logo } from './Logo';

interface SiteDetailPageProps {
    siteUrl: string;
    onNavigateBack: () => void;
}

const StatCard: React.FC<{ label: string; value: string; className?: string }> = ({ label, value, className = '' }) => (
    <div className="bg-slate-900/60 p-4 rounded-lg text-center border border-slate-800">
        <p className="text-xs text-text-secondary uppercase tracking-wider">{label}</p>
        <p className={`text-2xl font-bold font-mono mt-1 ${className}`}>{value}</p>
    </div>
);

export const SiteDetailPage: React.FC<SiteDetailPageProps> = ({ siteUrl, onNavigateBack }) => {
    const { user, removeUserPing, savePingResult, updateUserPings } = useAuth();
    const { settings } = useAppSettings();
    const [results, setResults] = useState<PingResult[]>([]);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'history' | 'incidents' | 'settings' | 'ai'>('history');

    // Site configuration
    const currentSite = useMemo(() => {
        return user?.pingedSites.find(s => s.url === siteUrl);
    }, [user, siteUrl]);

    // Frequency state (UX Standard: Single Item Detail Edit Action)
    const [frequency, setFrequency] = useState<PingFrequency>(currentSite?.frequency || '5min');
    const [isManualPinging, setIsManualPinging] = useState(false);

    // Alert settings state (UX Standard: Notification Settings)
    const [telegramBotToken, setTelegramBotToken] = useState(currentSite?.alertConfig?.telegramBotToken || '');
    const [telegramChatId, setTelegramChatId] = useState(currentSite?.alertConfig?.telegramChatId || '');
    const [webhookUrl, setWebhookUrl] = useState(currentSite?.alertConfig?.webhookUrl || '');
    const [alertsEnabled, setAlertsEnabled] = useState(currentSite?.alertConfig?.enabled ?? false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Destructive Action modal (UX Standard: Single Item Detail Destructive Actions)
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Public Status Link copy
    const [copiedPublicLink, setCopiedPublicLink] = useState(false);

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        // Ping Results query
        const qPings = query(
            collection(db, 'ping_results'),
            where("userId", "==", user.id),
            where("url", "==", siteUrl),
            orderBy("timestamp", "desc"),
            limit(100)
        );

        const unsubPings = onSnapshot(qPings,
            (querySnapshot) => {
                const fetchedResults: PingResult[] = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    fetchedResults.push({
                        ...data,
                        id: doc.id,
                        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
                    } as PingResult);
                });
                setResults(fetchedResults);
                setIsLoading(false);
            },
            (err) => {
                console.error("Error fetching site details:", err);
                setError(err.message);
                setIsLoading(false);
            }
        );

        // Incidents query
        const qIncidents = query(
            collection(db, 'incidents'),
            where("userId", "==", user.id),
            where("siteUrl", "==", siteUrl),
            orderBy("startedAt", "desc"),
            limit(50)
        );

        const unsubIncidents = onSnapshot(qIncidents,
            (querySnapshot) => {
                const fetchedIncidents: Incident[] = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    fetchedIncidents.push({
                        ...data,
                        id: doc.id,
                        startedAt: data.startedAt?.toDate ? data.startedAt.toDate() : new Date(),
                        resolvedAt: data.resolvedAt?.toDate ? data.resolvedAt.toDate() : null,
                    } as Incident);
                });
                setIncidents(fetchedIncidents);
            },
            (err) => {
                console.warn("Error fetching incidents:", err);
            }
        );

        return () => {
            unsubPings();
            unsubIncidents();
        };
    }, [user, siteUrl]);

    const stats = useMemo(() => {
        if (results.length === 0) {
            return {
                uptime: '100%',
                avgResponse: '0ms',
                online: 0,
                offline: 0,
                error: 0,
            };
        }

        const onlinePings = results.filter(r => r.status === 'Online');
        const validResponses = onlinePings.filter(r => r.responseTime !== null);
        const totalResponseTime = validResponses.reduce((acc, r) => acc + r.responseTime!, 0);

        const uptime = (onlinePings.length / results.length) * 100;
        const avgResponse = validResponses.length > 0 ? totalResponseTime / validResponses.length : 0;

        return {
            uptime: `${uptime.toFixed(1)}%`,
            avgResponse: `${Math.round(avgResponse)}ms`,
            online: onlinePings.length,
            offline: results.filter(r => r.status === 'Offline').length,
            error: results.filter(r => r.status === 'Error').length,
        };
    }, [results]);

    const handleRunManualPing = async () => {
        if (!user || isManualPinging) return;
        setIsManualPinging(true);

        try {
            const functions = getFunctions();
            const callPing = httpsCallable(functions, 'ping');
            const res = await callPing({ url: siteUrl });
            const data = res.data as PingResult;

            const newResult: PingResult = {
                id: data.id || crypto.randomUUID(),
                url: data.url || siteUrl,
                status: data.status,
                responseTime: data.responseTime,
                timestamp: new Date(),
                statusCode: data.statusCode,
                statusText: data.statusText,
                userId: user.id,
            };

            await savePingResult(newResult);
        } catch (e: any) {
            console.error("Manual ping error:", e);
        } finally {
            setIsManualPinging(false);
        }
    };

    const handleSaveSettings = async () => {
        if (!user) return;
        setIsSavingSettings(true);
        setSaveSuccess(false);

        try {
            const updatedPingedSites = user.pingedSites.map(site => {
                if (site.url === siteUrl) {
                    const alertConfig: AlertConfig = {
                        enabled: alertsEnabled,
                        telegramBotToken: telegramBotToken.trim(),
                        telegramChatId: telegramChatId.trim(),
                        webhookUrl: webhookUrl.trim(),
                    };
                    return { ...site, frequency, alertConfig };
                }
                return site;
            });

            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, { pingedSites: updatedPingedSites });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (e: any) {
            console.error("Error updating settings:", e);
            setError("Failed to save settings.");
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleDeleteMonitor = async () => {
        if (!user) return;
        setIsDeleting(true);
        try {
            await removeUserPing(user.id, siteUrl);
            onNavigateBack();
        } catch (e: any) {
            console.error("Error deleting monitor:", e);
            setError("Failed to delete monitor.");
            setIsDeleting(false);
        }
    };

    const handleCopyPublicStatusLink = () => {
        const publicUrl = `${window.location.origin}${window.location.pathname}?status=${encodeURIComponent(siteUrl)}`;
        navigator.clipboard.writeText(publicUrl);
        setCopiedPublicLink(true);
        setTimeout(() => setCopiedPublicLink(false), 2500);
    };

    return (
        <div className={`min-h-screen font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8 bg-dark-bg text-text-main theme-${settings.theme}`}>
            <div className="w-full max-w-7xl mx-auto space-y-6">
                {/* Header & Breadcrumb (UX Standard: Single Item Detail) */}
                <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onNavigateBack}
                            className="flex items-center gap-2 text-text-secondary hover:text-primary transition-colors min-h-[44px] min-w-[44px] focus:ring-2 focus:ring-primary rounded-lg px-2"
                            aria-label="Back to all monitors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span className="font-semibold text-sm">Dashboard</span>
                        </button>
                        <Logo />
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Run Check Now Action */}
                        <button
                            onClick={handleRunManualPing}
                            disabled={isManualPinging}
                            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors min-h-[44px]"
                            title="Run instant check"
                        >
                            <RefreshCw className={`w-4 h-4 ${isManualPinging ? 'animate-spin text-primary' : ''}`} />
                            <span>{isManualPinging ? "Checking..." : "Ping Now"}</span>
                        </button>

                        {/* Public Status Link */}
                        <button
                            onClick={handleCopyPublicStatusLink}
                            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 transition-colors min-h-[44px]"
                        >
                            {copiedPublicLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                            <span>{copiedPublicLink ? "Link Copied!" : "Share Status Page"}</span>
                        </button>
                    </div>
                </header>

                <main>
                    <div className={`bg-light-bg border border-slate-700 rounded-xl shadow-lg w-full ${settings.animationStyle === 'fade' ? 'anim-fade' : settings.animationStyle === 'slide' ? 'anim-slide' : 'anim-none'}`}>
                        {/* Summary Header */}
                        <div className="p-6 border-b border-slate-700">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Monitor Details</span>
                                    <h2 className="text-xl sm:text-2xl font-bold font-mono text-text-main mt-1 break-all" title={siteUrl}>
                                        {siteUrl}
                                    </h2>
                                </div>
                                <span className={`self-start sm:self-center px-3.5 py-1.5 rounded-full text-xs font-semibold border ${
                                    results[0]?.status === 'Online'
                                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                        : 'bg-rose-950 text-rose-400 border-rose-800'
                                }`}>
                                    ● {results[0]?.status || 'Checking...'}
                                </span>
                            </div>

                            {/* Stat Highlights */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                                <StatCard label="Uptime" value={stats.uptime} className="text-secondary" />
                                <StatCard label="Avg Response" value={stats.avgResponse} className="text-cyan-400" />
                                <StatCard label="Frequency" value={currentSite?.frequency || '5min'} className="text-indigo-400" />
                                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg text-center flex items-center justify-center gap-4">
                                   <div title="Online checks"><span className="text-emerald-400 font-bold font-mono">{stats.online}</span></div>
                                   <div title="Offline checks"><span className="text-rose-400 font-bold font-mono">{stats.offline}</span></div>
                                   <div title="Error checks"><span className="text-yellow-400 font-bold font-mono">{stats.error}</span></div>
                                </div>
                             </div>
                        </div>

                        {/* Navigation Tabs (UX Standard: Tabs Component) */}
                        <div className="flex border-b border-slate-700 px-3 overflow-x-auto">
                            <button 
                                onClick={() => setActiveTab('history')}
                                className={`py-3 px-4 text-sm font-semibold transition-colors flex items-center gap-2 min-h-[44px] ${activeTab === 'history' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-main'}`}>
                                <Clock className="w-4 h-4" />
                                Checks History ({results.length})
                            </button>
                            <button 
                                onClick={() => setActiveTab('incidents')}
                                className={`py-3 px-4 text-sm font-semibold transition-colors flex items-center gap-2 min-h-[44px] ${activeTab === 'incidents' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-main'}`}>
                                <AlertTriangle className="w-4 h-4" />
                                Incidents ({incidents.length})
                            </button>
                            <button 
                                onClick={() => setActiveTab('settings')}
                                className={`py-3 px-4 text-sm font-semibold transition-colors flex items-center gap-2 min-h-[44px] ${activeTab === 'settings' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-main'}`}>
                                <Sliders className="w-4 h-4" />
                                Configuration & Alerts
                            </button>
                            <button 
                                onClick={() => setActiveTab('ai')}
                                className={`py-3 px-4 text-sm font-semibold transition-colors flex items-center gap-2 min-h-[44px] ${activeTab === 'ai' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-main'}`}>
                                AI Health Diagnostic
                            </button>
                        </div>

                        <div className="p-6">
                            {error && (
                                <div className="text-center text-rose-400 p-4 bg-rose-950/30 border border-rose-900 rounded-xl mb-4 text-sm font-medium">{error}</div>
                            )}

                            {/* Checks History Tab */}
                            {activeTab === 'history' && (
                                <div className="flex flex-col gap-4 max-h-[55vh] overflow-y-auto pr-2">
                                    {isLoading ? (
                                        <div className="flex justify-center items-center py-12">
                                            <Spinner className="w-8 h-8 text-primary" />
                                            <p className="ml-4 text-text-secondary text-sm">Fetching telemetry history...</p>
                                        </div>
                                    ) : results.length > 0 ? results.map(result => (
                                        <PingResultCard key={result.id} result={result} />
                                    )) : (
                                        <div className="py-12 text-center text-text-secondary space-y-3">
                                            <Clock className="w-10 h-10 mx-auto text-slate-500 opacity-60" />
                                            <h4 className="font-bold text-text-main">No Ping History Yet</h4>
                                            <p className="text-xs max-w-sm mx-auto">This monitor has recently been created and has not recorded any automated checks yet.</p>
                                            <button
                                                onClick={handleRunManualPing}
                                                disabled={isManualPinging}
                                                className="mt-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold min-h-[44px]"
                                            >
                                                Run First Check Now
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Incidents Tab */}
                            {activeTab === 'incidents' && (
                                <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2">
                                    {incidents.length === 0 ? (
                                        <div className="py-12 text-center text-text-secondary space-y-2">
                                            <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-2 opacity-90" />
                                            <h4 className="font-bold text-text-main text-base">Zero Downtime Incidents</h4>
                                            <p className="text-xs text-text-secondary">This monitor has sustained uninterrupted operational performance.</p>
                                        </div>
                                    ) : (
                                        incidents.map((incident) => {
                                            const isOngoing = incident.status === 'ongoing';
                                            const mins = incident.durationSeconds ? Math.max(1, Math.round(incident.durationSeconds / 60)) : 1;
                                            return (
                                                <div key={incident.id} className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-start justify-between gap-4">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${isOngoing ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'}`}>
                                                                {isOngoing ? 'ONGOING OUTAGE' : 'RESOLVED'}
                                                            </span>
                                                            <span className="font-mono text-sm font-semibold">{incident.cause}</span>
                                                        </div>
                                                        <p className="text-xs text-text-secondary mt-1.5">
                                                            Started: {incident.startedAt.toLocaleString()}
                                                            {incident.resolvedAt && ` • Resolved: ${incident.resolvedAt.toLocaleTimeString()}`}
                                                        </p>
                                                    </div>
                                                    <div className="text-right text-xs font-mono text-text-secondary">
                                                        {isOngoing ? (
                                                            <span className="text-rose-400 font-bold animate-pulse">Outage Active</span>
                                                        ) : (
                                                            <span>~{mins} min downtime</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}

                            {/* Configuration & Alerts Tab (UX Standards: Single Item Detail Edit & Notification Settings) */}
                            {activeTab === 'settings' && (
                                <div className="max-w-2xl mx-auto py-4 space-y-8">
                                    {/* Edit Section 1: Monitoring Frequency */}
                                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                                        <h4 className="font-bold text-sm text-text-main flex items-center gap-2">
                                            <Sliders className="w-4 h-4 text-primary" />
                                            Monitoring Frequency
                                        </h4>
                                        <p className="text-xs text-text-secondary">Choose how often Pynor pings this target URL in the background.</p>
                                        <select
                                            value={frequency}
                                            onChange={(e) => setFrequency(e.target.value as PingFrequency)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary min-h-[44px]"
                                        >
                                            <option value="1min">Every 1 Minute (High Precision)</option>
                                            <option value="5min">Every 5 Minutes (Standard)</option>
                                            <option value="15min">Every 15 Minutes</option>
                                            <option value="30min">Every 30 Minutes</option>
                                            <option value="1hr">Every 1 Hour</option>
                                            <option value="6hr">Every 6 Hours</option>
                                            <option value="12hr">Every 12 Hours</option>
                                            <option value="24hr">Every 24 Hours</option>
                                        </select>
                                    </div>

                                    {/* Edit Section 2: Automated Alert Rules */}
                                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-5">
                                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                            <div>
                                                <h4 className="font-bold text-sm text-text-main flex items-center gap-2">
                                                    <Bell className="w-4 h-4 text-primary" />
                                                    Automated Outage & Recovery Alerts
                                                </h4>
                                                <p className="text-xs text-text-secondary mt-0.5">Receive immediate notifications on Telegram or via Webhook.</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={alertsEnabled}
                                                    onChange={(e) => setAlertsEnabled(e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
                                                    Telegram Bot Token
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="123456789:ABCdefGhI..."
                                                    value={telegramBotToken}
                                                    onChange={(e) => setTelegramBotToken(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary font-mono min-h-[44px]"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
                                                    Telegram Chat ID
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. 987654321"
                                                    value={telegramChatId}
                                                    onChange={(e) => setTelegramChatId(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary font-mono min-h-[44px]"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
                                                    Discord / Slack / Generic Webhook URL
                                                </label>
                                                <input
                                                    type="url"
                                                    placeholder="https://discord.com/api/webhooks/..."
                                                    value={webhookUrl}
                                                    onChange={(e) => setWebhookUrl(e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary font-mono min-h-[44px]"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2">
                                            <button
                                                onClick={handleSaveSettings}
                                                disabled={isSavingSettings}
                                                className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold text-sm transition-colors flex items-center gap-2 min-h-[44px]"
                                            >
                                                {isSavingSettings ? <Spinner className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                                                <span>{isSavingSettings ? "Saving Changes..." : "Save Configuration"}</span>
                                            </button>
                                            {saveSuccess && (
                                                <span className="text-xs text-emerald-400 font-semibold animate-fade-in">Preferences saved successfully!</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Destructive Action Section (UX Standard: Single Item Detail Destructive Actions) */}
                                    <div className="border border-rose-950/60 bg-rose-950/20 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <h4 className="font-bold text-sm text-rose-300">Danger Zone</h4>
                                            <p className="text-xs text-rose-300/70 mt-0.5">Permanently remove this site from your monitored targets.</p>
                                        </div>
                                        <button
                                            onClick={() => setShowDeleteModal(true)}
                                            className="px-4 py-2 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700 text-xs font-semibold transition-colors flex items-center gap-2 self-start sm:self-auto min-h-[44px]"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            <span>Delete Monitor</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* AI Diagnostics Tab */}
                            {activeTab === 'ai' && (
                                <PingChatView pingHistory={results} />
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* Delete Confirmation Modal (UX Standard: Single Item Detail Destructive Action Verification) */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 relative shadow-2xl">
                        <button
                            onClick={() => setShowDeleteModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            aria-label="Close dialog"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-lg bg-rose-950 text-rose-400 border border-rose-800">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-white">Delete Monitor?</h3>
                                <p className="text-xs text-slate-400">This action cannot be undone.</p>
                            </div>
                        </div>

                        <p className="text-sm text-slate-300 mb-6">
                            Are you sure you want to delete <span className="font-mono font-semibold text-white">{siteUrl}</span>? Historical telemetry records will no longer be monitored by the automated scheduler.
                        </p>

                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold min-h-[44px]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteMonitor}
                                disabled={isDeleting}
                                className="px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-2 min-h-[44px]"
                            >
                                {isDeleting ? <Spinner className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                                <span>{isDeleting ? "Deleting..." : "Confirm Delete"}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
