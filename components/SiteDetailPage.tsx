import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAppSettings } from '../hooks/useAppSettings';
import type { PingResult, Incident, AlertConfig } from '../types';
import { PingResultCard } from './PingResultCard';
import { PingChatView } from './PingChatView';
import { Spinner } from './Spinner';
import { ArrowLeft, Bell, Clock, Globe, ShieldCheck, Share2, Check, AlertTriangle, Send } from 'lucide-react';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc } from 'firebase/firestore';
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
    const { user } = useAuth();
    const { settings } = useAppSettings();
    const [results, setResults] = useState<PingResult[]>([]);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'history' | 'incidents' | 'alerts' | 'ai'>('history');

    // Alert settings state
    const currentSite = useMemo(() => {
        return user?.pingedSites.find(s => s.url === siteUrl);
    }, [user, siteUrl]);

    const [telegramBotToken, setTelegramBotToken] = useState(currentSite?.alertConfig?.telegramBotToken || '');
    const [telegramChatId, setTelegramChatId] = useState(currentSite?.alertConfig?.telegramChatId || '');
    const [webhookUrl, setWebhookUrl] = useState(currentSite?.alertConfig?.webhookUrl || '');
    const [alertsEnabled, setAlertsEnabled] = useState(currentSite?.alertConfig?.enabled ?? false);
    const [isSavingAlerts, setIsSavingAlerts] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [copiedPublicLink, setCopiedPublicLink] = useState(false);

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        // Subscribe to Ping Results
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
                        timestamp: (data.timestamp && typeof data.timestamp.toDate === 'function') ? data.timestamp.toDate() : new Date(),
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

        // Subscribe to Incidents
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
                uptime: 'N/A',
                avgResponse: 'N/A',
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

    const handleSaveAlerts = async () => {
        if (!user) return;
        setIsSavingAlerts(true);
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
                    return { ...site, alertConfig };
                }
                return site;
            });

            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, { pingedSites: updatedPingedSites });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (e: any) {
            console.error("Error updating alert settings:", e);
            setError("Failed to save alert settings.");
        } finally {
            setIsSavingAlerts(false);
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
                <header className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button onClick={onNavigateBack} className="flex items-center gap-2 text-text-secondary hover:text-primary transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                            Back
                        </button>
                        <Logo />
                    </div>
                    <button
                        onClick={handleCopyPublicStatusLink}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 transition-colors"
                    >
                        {copiedPublicLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                        {copiedPublicLink ? "Link Copied!" : "Public Status Page"}
                    </button>
                </header>

                <main>
                    <div className={`bg-light-bg border border-slate-700 rounded-lg shadow-lg w-full ${settings.animationStyle === 'fade' ? 'anim-fade' : settings.animationStyle === 'slide' ? 'anim-slide' : 'anim-none'}`}>
                        <div className="p-5 border-b border-slate-700">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl lg:text-2xl font-bold text-text-main truncate font-mono" title={siteUrl}>{siteUrl}</h2>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${results[0]?.status === 'Online' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}`}>
                                    {results[0]?.status || 'Checking...'}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                <StatCard label="Uptime" value={stats.uptime} className="text-secondary" />
                                <StatCard label="Avg Response" value={stats.avgResponse} className="text-cyan-400" />
                                <StatCard label="Total Checks" value={results.length.toString()} className="text-text-main" />
                                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg text-center flex items-center justify-center gap-4">
                                   <div title="Online"><span className="text-green-500 font-bold">{stats.online}</span></div>
                                   <div title="Offline"><span className="text-red-500 font-bold">{stats.offline}</span></div>
                                   <div title="Error"><span className="text-yellow-500 font-bold">{stats.error}</span></div>
                                </div>
                             </div>
                        </div>
                        
                        <div className="flex border-b border-slate-700 px-2 overflow-x-auto">
                            <button 
                                onClick={() => setActiveTab('history')}
                                className={`py-3 px-4 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-main'}`}>
                                <Clock className="w-4 h-4" />
                                Checks ({results.length})
                            </button>
                            <button 
                                onClick={() => setActiveTab('incidents')}
                                className={`py-3 px-4 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'incidents' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-main'}`}>
                                <AlertTriangle className="w-4 h-4" />
                                Incidents ({incidents.length})
                            </button>
                            <button 
                                onClick={() => setActiveTab('alerts')}
                                className={`py-3 px-4 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'alerts' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-main'}`}>
                                <Bell className="w-4 h-4" />
                                Alert Rules
                            </button>
                            <button 
                                onClick={() => setActiveTab('ai')}
                                className={`py-3 px-4 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'ai' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-main'}`}>
                                AI Diagnostic
                            </button>
                        </div>

                        <div className="p-5">
                            {error && (
                                <div className="text-center text-red-400 p-4 bg-red-950/20 border border-red-900 rounded-lg mb-4">{error}</div>
                            )}

                            {/* Checks History Tab */}
                            {activeTab === 'history' && (
                                <div className="flex flex-col gap-4 max-h-[55vh] overflow-y-auto pr-2">
                                    {isLoading ? (
                                        <div className="flex justify-center items-center py-8">
                                            <Spinner className="w-8 h-8" />
                                            <p className="ml-4 text-text-secondary">Fetching history...</p>
                                        </div>
                                    ) : results.length > 0 ? results.map(result => (
                                        <PingResultCard key={result.id} result={result} />
                                    )) : (
                                       <p className="text-center text-text-secondary py-8">No ping history for this site yet.</p>
                                    )}
                                </div>
                            )}

                            {/* Incidents Tab */}
                            {activeTab === 'incidents' && (
                                <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2">
                                    {incidents.length === 0 ? (
                                        <div className="py-12 text-center text-text-secondary">
                                            <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                                            <p className="font-semibold text-text-main">No Incidents Detected</p>
                                            <p className="text-xs mt-1">This site has maintained 100% uptime with zero outages.</p>
                                        </div>
                                    ) : (
                                        incidents.map((incident) => {
                                            const isOngoing = incident.status === 'ongoing';
                                            const mins = incident.durationSeconds ? Math.max(1, Math.round(incident.durationSeconds / 60)) : 1;
                                            return (
                                                <div key={incident.id} className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 flex items-start justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${isOngoing ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'}`}>
                                                                {isOngoing ? 'ONGOING' : 'RESOLVED'}
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

                            {/* Alert Rules Tab */}
                            {activeTab === 'alerts' && (
                                <div className="max-w-xl mx-auto py-4 space-y-6">
                                    <div className="flex items-center justify-between p-4 rounded-lg bg-slate-900/60 border border-slate-800">
                                        <div>
                                            <h4 className="font-semibold text-sm">Enable Automated Alerts</h4>
                                            <p className="text-xs text-text-secondary">Receive instant notifications when this site goes down or recovers.</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={alertsEnabled}
                                            onChange={(e) => setAlertsEnabled(e.target.checked)}
                                            className="w-5 h-5 rounded text-primary focus:ring-primary bg-slate-800 border-slate-700"
                                        />
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
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:border-primary font-mono"
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
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:border-primary font-mono"
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
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-text-main focus:outline-none focus:border-primary font-mono"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2">
                                        <button
                                            onClick={handleSaveAlerts}
                                            disabled={isSavingAlerts}
                                            className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold text-sm transition-colors flex items-center gap-2"
                                        >
                                            {isSavingAlerts ? <Spinner className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                                            {isSavingAlerts ? "Saving..." : "Save Alert Settings"}
                                        </button>
                                        {saveSuccess && (
                                            <span className="text-xs text-emerald-400 font-semibold">Settings saved successfully!</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* AI Tab */}
                            {activeTab === 'ai' && (
                                <PingChatView pingHistory={results} />
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};
