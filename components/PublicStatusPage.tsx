import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../src/firebase';
import type { PingResult, Incident } from '../types';
import { Spinner } from './Spinner';
import { ShieldCheck, ArrowLeft, CheckCircle, AlertTriangle, XCircle, Clock, ExternalLink } from 'lucide-react';
import { Logo } from './Logo';

interface PublicStatusPageProps {
    siteUrl: string;
    onNavigateHome: () => void;
}

export const PublicStatusPage: React.FC<PublicStatusPageProps> = ({ siteUrl, onNavigateHome }) => {
    const [results, setResults] = useState<PingResult[]>([]);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);

        // Fetch recent ping results
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

        // Fetch incidents
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
            return { uptime: '100%', avgResponse: '0ms', currentStatus: 'Online' as const };
        }
        const onlinePings = results.filter((r) => r.status === 'Online');
        const uptime = (onlinePings.length / results.length) * 100;
        const validTimes = onlinePings.filter((r) => r.responseTime !== null).map((r) => r.responseTime!);
        const avg = validTimes.length > 0 ? validTimes.reduce((a, b) => a + b, 0) / validTimes.length : 0;
        const currentStatus = results[0]?.status || 'Online';

        return {
            uptime: `${uptime.toFixed(1)}%`,
            avgResponse: `${Math.round(avg)}ms`,
            currentStatus,
        };
    }, [results]);

    const activeIncident = incidents.find((i) => i.status === 'ongoing');

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
            {/* Top Navigation */}
            <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onNavigateHome}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="Go to App"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <Logo className="w-8 h-8 text-cyan-400" />
                    <div>
                        <h1 className="text-lg font-bold tracking-tight">Pynor Public Status</h1>
                        <p className="text-xs text-slate-400">Oladizz Agency Network</p>
                    </div>
                </div>
                <a
                    href="https://oladizz.xyz"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-950/40 border border-cyan-800/60 px-3 py-1.5 rounded-full"
                >
                    <span>Oladizz Agency</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                </a>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-10 space-y-8">
                {/* Target Information Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                    <div>
                        <span className="text-xs font-semibold tracking-wider text-cyan-400 uppercase">Monitoring Target</span>
                        <h2 className="text-2xl md:text-3xl font-extrabold font-mono text-white mt-1 break-all">{siteUrl}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {stats.currentStatus === 'Online' && (
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-700/50">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                                All Systems Operational
                            </span>
                        )}
                        {stats.currentStatus !== 'Online' && (
                            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-rose-950/80 text-rose-400 border border-rose-700/50">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                                Service Disruption Detected
                            </span>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                        <Spinner className="w-10 h-10 text-cyan-400" />
                        <p className="mt-4 text-sm">Loading real-time status data...</p>
                    </div>
                ) : (
                    <>
                        {/* Active Incident Alert Banner */}
                        {activeIncident && (
                            <div className="p-5 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-200 flex items-start gap-4">
                                <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-bold text-rose-300">Active Incident Reported</h3>
                                    <p className="text-sm mt-1 text-rose-200">
                                        Cause: <span className="font-mono font-semibold">{activeIncident.cause}</span>
                                    </p>
                                    <p className="text-xs text-rose-400/80 mt-1">
                                        Started: {activeIncident.startedAt.toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Metric Highlights */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl text-center">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Uptime (Recent)</p>
                                <p className="text-3xl font-extrabold font-mono text-emerald-400 mt-2">{stats.uptime}</p>
                            </div>
                            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl text-center">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Response Time</p>
                                <p className="text-3xl font-extrabold font-mono text-cyan-400 mt-2">{stats.avgResponse}</p>
                            </div>
                            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl text-center">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Checks</p>
                                <p className="text-3xl font-extrabold font-mono text-indigo-400 mt-2">{results.length}</p>
                            </div>
                        </div>

                        {/* Recent Ping Latency Strip */}
                        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl space-y-3">
                            <div className="flex items-center justify-between text-xs text-slate-400">
                                <span>Recent 60 Checks Timeline</span>
                                <span className="text-emerald-400">Green = Online, Red = Offline</span>
                            </div>
                            <div className="flex items-end gap-1.5 h-16 pt-2">
                                {results.slice(0, 40).reverse().map((r) => (
                                    <div
                                        key={r.id}
                                        title={`${r.timestamp.toLocaleTimeString()} - ${r.status} (${r.responseTime || 0}ms)`}
                                        className={`flex-1 rounded-sm transition-all hover:scale-110 ${
                                            r.status === 'Online'
                                                ? 'bg-emerald-500 hover:bg-emerald-400 h-10'
                                                : 'bg-rose-500 hover:bg-rose-400 h-14'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Incident History Timeline */}
                        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-xl space-y-4">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Clock className="w-5 h-5 text-cyan-400" />
                                <span>Incident History</span>
                            </h3>

                            {incidents.length === 0 ? (
                                <div className="py-6 text-center text-slate-400 text-sm">
                                    <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                                    No recorded downtime incidents for this target. 100% operational.
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
                                                        <span className="text-rose-400 animate-pulse">Ongoing</span>
                                                    ) : (
                                                        <span>~{mins} min(s) down</span>
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

            {/* Footer */}
            <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
                <p>
                    Uptime infrastructure by{' '}
                    <a href="https://github.com/Oladizz/Pynor" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">
                        Pynor
                    </a>{' '}
                    • An{' '}
                    <a href="https://oladizz.xyz" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">
                        Oladizz Agency
                    </a>{' '}
                    Product
                </p>
            </footer>
        </div>
    );
};
