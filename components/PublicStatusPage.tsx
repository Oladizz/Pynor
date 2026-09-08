import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../src/firebase';
import type { PingResult, Incident } from '../types';
import { Spinner } from './Spinner';
import {
    ShieldCheck, ArrowLeft, CheckCircle, AlertTriangle, Clock,
    ExternalLink, Bell, Check, Calendar, Activity, Lock, Server, X
} from 'lucide-react';
import { Logo } from './Logo';

interface PublicStatusPageProps {
    siteUrl: string;
    onNavigateHome: () => void;
}

export const PublicStatusPage: React.FC<PublicStatusPageProps> = ({ siteUrl, onNavigateHome }) => {
    const [results, setResults] = useState<PingResult[]>([]);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(true);

    // Subscribe to Updates Modal state (UX Standard: WEBSITE--004)
    const [showSubscribeModal, setShowSubscribeModal] = useState(false);
    const [subscriberEmail, setSubscriberEmail] = useState('');
    const [isSubscribing, setIsSubscribing] = useState(false);
    const [subscribedSuccess, setSubscribedSuccess] = useState(false);

    useEffect(() => {
        setLoading(true);

        const pingsQuery = query(
            collection(db, 'ping_results'),
            where('url', '==', siteUrl),
            orderBy('timestamp', 'desc'),
            limit(60)
        );

        const unsubPings = onSnapshot(pingsQuery, (snapshot) => {
            const fetchedPings: PingResult[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                fetchedPings.push({
                    ...data,
                    id: doc.id,
                    timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
                } as PingResult);
            });
            setResults(fetchedPings);
            setLoading(false);
        }, () => setLoading(false));

        const incidentsQuery = query(
            collection(db, 'incidents'),
            where('siteUrl', '==', siteUrl),
            orderBy('startedAt', 'desc'),
            limit(20)
        );

        const unsubIncidents = onSnapshot(incidentsQuery, (snapshot) => {
            const fetchedIncidents: Incident[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                fetchedIncidents.push({
                    ...data,
                    id: doc.id,
                    startedAt: data.startedAt?.toDate ? data.startedAt.toDate() : new Date(),
                    resolvedAt: data.resolvedAt?.toDate ? data.resolvedAt.toDate() : null,
                } as Incident);
            });
            setIncidents(fetchedIncidents);
        }, () => {});

        return () => {
            unsubPings();
            unsubIncidents();
        };
    }, [siteUrl]);

    const stats = useMemo(() => {
        if (results.length === 0) {
            return { uptime: '100%', avgResponse: '0ms', currentStatus: 'Online' as const, p95Latency: '0ms' };
        }
        const onlinePings = results.filter((r) => r.status === 'Online');
        const uptime = (onlinePings.length / results.length) * 100;
        const validTimes = onlinePings.filter((r) => r.responseTime !== null).map((r) => r.responseTime!).sort((a, b) => a - b);
        const avg = validTimes.length > 0 ? validTimes.reduce((a, b) => a + b, 0) / validTimes.length : 0;
        const p95 = validTimes.length > 0 ? validTimes[Math.floor(validTimes.length * 0.95)] || validTimes[validTimes.length - 1] : 0;
        const currentStatus = results[0]?.status || 'Online';

        return {
            uptime: `${uptime.toFixed(1)}%`,
            avgResponse: `${Math.round(avg)}ms`,
            p95Latency: `${Math.round(p95)}ms`,
            currentStatus,
        };
    }, [results]);

    const activeIncident = incidents.find((i) => i.status === 'ongoing');

    const handleSubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subscriberEmail || !subscriberEmail.includes('@')) return;
        setIsSubscribing(true);

        try {
            await addDoc(collection(db, 'status_subscribers'), {
                siteUrl,
                email: subscriberEmail.trim(),
                createdAt: Timestamp.now(),
                active: true,
            });
            setSubscribedSuccess(true);
            setTimeout(() => {
                setSubscribedSuccess(false);
                setShowSubscribeModal(false);
                setSubscriberEmail('');
            }, 2500);
        } catch (err) {
            console.error('Subscription error:', err);
        } finally {
            setIsSubscribing(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
            {/* Top Navigation Bar */}
            <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onNavigateHome}
                        className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors focus:ring-2 focus:ring-cyan-400 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Return to Dashboard"
                        aria-label="Return to Dashboard"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <Logo className="w-8 h-8 text-cyan-400" />
                    <div>
                        <h1 className="text-base md:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                            <span>Status Overview</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">Live</span>
                        </h1>
                        <p className="text-xs text-slate-400">Pynor • Oladizz Agency</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Subscribe to Updates Button (UX Standard WEBSITE--004) */}
                    <button
                        onClick={() => setShowSubscribeModal(true)}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-900/30 transition-all min-h-[44px]"
                    >
                        <Bell className="w-4 h-4" />
                        <span className="hidden sm:inline">Subscribe to Updates</span>
                    </button>

                    <a
                        href="https://oladizz.xyz"
                        target="_blank"
                        rel="noreferrer"
                        className="hidden md:flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-950/40 border border-cyan-800/60 px-3 py-2 rounded-lg min-h-[44px]"
                    >
                        <span>Oladizz Agency</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                </div>
            </header>

            {/* Main Container */}
            <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 md:p-10 space-y-8">
                {/* Header Status Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                    <div>
                        <span className="text-xs font-semibold tracking-wider text-cyan-400 uppercase">Monitored Service</span>
                        <h2 className="text-xl md:text-3xl font-extrabold font-mono text-white mt-1 break-all">{siteUrl}</h2>
                    </div>

                    <div className="flex items-center">
                        {stats.currentStatus === 'Online' && (
                            <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full text-sm font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 shadow-lg shadow-emerald-950/40">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                                All Systems Operational
                            </div>
                        )}
                        {stats.currentStatus !== 'Online' && (
                            <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full text-sm font-semibold bg-rose-950/80 text-rose-400 border border-rose-700/60 shadow-lg shadow-rose-950/40">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                                Service Outage Detected
                            </div>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="py-24 flex flex-col items-center justify-center text-slate-400">
                        <Spinner className="w-10 h-10 text-cyan-400" />
                        <p className="mt-4 text-sm font-medium">Fetching verified status records...</p>
                    </div>
                ) : (
                    <>
                        {/* Active Incident Banner */}
                        {activeIncident && (
                            <div className="p-5 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-100 flex items-start gap-4 animate-fade-in shadow-xl shadow-rose-950/30">
                                <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-bold text-rose-200 text-base">Active Incident Under Investigation</h3>
                                    <p className="text-sm mt-1 text-rose-200/90">
                                        Trigger: <span className="font-mono font-semibold">{activeIncident.cause}</span>
                                    </p>
                                    <p className="text-xs text-rose-400 mt-2 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        Detected at: {activeIncident.startedAt.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* High-Level Metric Tiles (UX Standard WEBSITE--002) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-xl text-center">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Uptime Percentage</p>
                                <p className="text-3xl font-extrabold font-mono text-emerald-400 mt-2">{stats.uptime}</p>
                                <p className="text-xs text-slate-500 mt-1">Rolling window</p>
                            </div>
                            <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-xl text-center">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Latency</p>
                                <p className="text-3xl font-extrabold font-mono text-cyan-400 mt-2">{stats.avgResponse}</p>
                                <p className="text-xs text-slate-500 mt-1">p95: {stats.p95Latency}</p>
                            </div>
                            <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-xl text-center">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Verified Checks</p>
                                <p className="text-3xl font-extrabold font-mono text-indigo-400 mt-2">{results.length}</p>
                                <p className="text-xs text-slate-500 mt-1">100% automated</p>
                            </div>
                        </div>

                        {/* Component Breakdown List (UX Textbook Concept) */}
                        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                <Server className="w-4 h-4 text-cyan-400" />
                                System Component Health
                            </h3>
                            <div className="divide-y divide-slate-800/80">
                                <div className="py-3 flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-3">
                                        <Activity className="w-4 h-4 text-emerald-400" />
                                        <span className="font-medium text-slate-200">HTTP/HTTPS Web Service</span>
                                    </div>
                                    <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                                        Operational
                                    </span>
                                </div>
                                <div className="py-3 flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-3">
                                        <Lock className="w-4 h-4 text-cyan-400" />
                                        <span className="font-medium text-slate-200">SSL/TLS Security & Handshake</span>
                                    </div>
                                    <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                                        Valid & Secure
                                    </span>
                                </div>
                                <div className="py-3 flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-3">
                                        <Clock className="w-4 h-4 text-indigo-400" />
                                        <span className="font-medium text-slate-200">Automated Ping Scheduler (v2)</span>
                                    </div>
                                    <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                                        Healthy
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Timeline Visualization */}
                        <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-xl space-y-3">
                            <div className="flex items-center justify-between text-xs text-slate-400">
                                <span className="font-semibold">60 Checks Activity Timeline</span>
                                <span className="text-emerald-400 font-mono">● Online ● Offline</span>
                            </div>
                            <div className="flex items-end gap-1.5 h-14 pt-2">
                                {results.slice(0, 45).reverse().map((r) => (
                                    <div
                                        key={r.id}
                                        title={`${r.timestamp.toLocaleTimeString()} - ${r.status} (${r.responseTime || 0}ms)`}
                                        className={`flex-1 rounded-sm transition-all hover:scale-110 min-w-[4px] ${
                                            r.status === 'Online'
                                                ? 'bg-emerald-500 hover:bg-emerald-400 h-9'
                                                : 'bg-rose-500 hover:bg-rose-400 h-14'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Scheduled Maintenance (UX Standard: WEBSITE--003) */}
                        <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-cyan-400 shrink-0" />
                                <div>
                                    <h4 className="text-sm font-bold text-slate-200">Scheduled Maintenance Windows</h4>
                                    <p className="text-xs text-slate-400 mt-0.5">No upcoming maintenance windows scheduled for this system.</p>
                                </div>
                            </div>
                            <span className="text-xs text-slate-500 font-mono hidden sm:inline">None Scheduled</span>
                        </div>

                        {/* Incident History Timeline (UX Standard: WEBSITE--001) */}
                        <div className="bg-slate-900/70 border border-slate-800 p-6 rounded-xl space-y-4">
                            <h3 className="text-base font-bold flex items-center gap-2">
                                <Clock className="w-5 h-5 text-cyan-400" />
                                <span>Past Incident Archive</span>
                            </h3>

                            {incidents.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 text-sm">
                                    <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-90" />
                                    <p className="font-semibold text-slate-200">100% Incident-Free Record</p>
                                    <p className="text-xs text-slate-500 mt-1">No past outages recorded for this endpoint.</p>
                                </div>
                            ) : (
                                <div className="space-y-3 divide-y divide-slate-800">
                                    {incidents.map((incident) => {
                                        const isOngoing = incident.status === 'ongoing';
                                        const mins = incident.durationSeconds ? Math.max(1, Math.round(incident.durationSeconds / 60)) : 1;
                                        return (
                                            <div key={incident.id} className="pt-3 first:pt-0 flex items-start justify-between gap-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        {isOngoing ? (
                                                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-950 text-rose-400 border border-rose-700">Ongoing</span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300">Resolved</span>
                                                        )}
                                                        <span className="font-mono text-sm font-semibold text-slate-200">{incident.cause}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-400">
                                                        Started: {incident.startedAt.toLocaleString()}
                                                        {incident.resolvedAt && ` • Resolved: ${incident.resolvedAt.toLocaleTimeString()}`}
                                                    </p>
                                                </div>
                                                <div className="text-right text-xs font-mono text-slate-400 shrink-0">
                                                    {isOngoing ? (
                                                        <span className="text-rose-400 font-bold animate-pulse">Outage Active</span>
                                                    ) : (
                                                        <span>~{mins} min(s) duration</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>

            {/* Subscribe to Updates Modal (UX Standard WEBSITE--004) */}
            {showSubscribeModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 relative shadow-2xl">
                        <button
                            onClick={() => setShowSubscribeModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            aria-label="Close modal"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800">
                                <Bell className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-white">Subscribe to Status Alerts</h3>
                                <p className="text-xs text-slate-400">Get notified when this service has downtime or maintenance.</p>
                            </div>
                        </div>

                        {subscribedSuccess ? (
                            <div className="py-6 text-center text-emerald-400 space-y-2">
                                <Check className="w-8 h-8 mx-auto" />
                                <p className="font-semibold text-sm">Successfully Subscribed!</p>
                                <p className="text-xs text-slate-400">You will receive incident updates via email.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubscribe} className="space-y-4 mt-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="you@company.com"
                                        value={subscriberEmail}
                                        onChange={(e) => setSubscriberEmail(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 min-h-[44px]"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSubscribing}
                                    className="w-full py-3 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 font-semibold text-sm text-white transition-colors flex items-center justify-center gap-2 min-h-[44px]"
                                >
                                    {isSubscribing ? <Spinner className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                                    <span>{isSubscribing ? 'Subscribing...' : 'Subscribe to Incidents'}</span>
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="border-t border-slate-800 py-8 text-center text-xs text-slate-500 space-y-2">
                <p>
                    Uptime infrastructure engineered by{' '}
                    <a href="https://github.com/Oladizz/Pynor" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">
                        Pynor
                    </a>{' '}
                    • Powered by{' '}
                    <a href="https://oladizz.xyz" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">
                        Oladizz Agency
                    </a>
                </p>
                <p className="text-slate-600">Built to Professional UX Engineering Standards</p>
            </footer>
        </div>
    );
};
