import React, { useMemo, useState } from 'react';
import type { PingResult } from '../types';
import { PingResultCard } from './PingResultCard';
import { PingChatView } from './PingChatView';
import { Spinner } from './Spinner';

interface SiteDetailViewProps {
    siteUrl: string;
    results: PingResult[];
    isLoading: boolean;
}

const StatCard: React.FC<{ label: string; value: string; className?: string }> = ({ label, value, className = '' }) => (
    <div className="bg-slate-900/50 p-4 rounded-lg text-center">
        <p className="text-sm text-text-secondary uppercase tracking-wider">{label}</p>
        <p className={`text-2xl font-bold font-mono mt-1 ${className}`}>{value}</p>
    </div>
);

export const SiteDetailView: React.FC<SiteDetailViewProps> = ({ siteUrl, results, isLoading }) => {
    const [activeTab, setActiveTab] = useState<'history' | 'ai'>('history');

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

    return (
        <div className="bg-light-bg border border-slate-700 rounded-lg shadow-lg animate-entry w-full">
            <div className="p-4 border-b border-slate-700">
                 <h2 className="text-xl font-bold text-text-main truncate" title={siteUrl}>{siteUrl}</h2>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <StatCard label="Uptime" value={stats.uptime} className="text-secondary" />
                    <StatCard label="Avg Response" value={stats.avgResponse} className="text-blue-400" />
                    <StatCard label="Total Pings" value={results.length.toString()} className="text-text-main" />
                    <div className="bg-slate-900/50 p-3 rounded-lg text-center flex items-center justify-center gap-4">
                       <div title="Online"><span className="text-green-500 font-bold">{stats.online}</span></div>
                       <div title="Offline"><span className="text-red-500 font-bold">{stats.offline}</span></div>
                       <div title="Error"><span className="text-yellow-500 font-bold">{stats.error}</span></div>
                    </div>
                 </div>
            </div>
            
            <div className="flex border-b border-slate-700 px-2">
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`py-2 px-4 text-sm font-medium transition-colors ${activeTab === 'history' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-main'}`}>
                    History ({results.length})
                </button>
                <button 
                    onClick={() => setActiveTab('ai')}
                    className={`py-2 px-4 text-sm font-medium transition-colors ${activeTab === 'ai' ? 'text-primary border-b-2 border-primary' : 'text-text-secondary hover:text-text-main'}`}>
                    AI Assistant
                </button>
            </div>

            <div className="p-4">
                {activeTab === 'history' ? (
                    <div className="flex flex-col gap-4 max-h-[45vh] overflow-y-auto pr-2">
                        {isLoading && results.length === 0 ? (
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
                ) : (
                    <PingChatView pingHistory={results} />
                )}
            </div>

        </div>
    );
};