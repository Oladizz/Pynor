import React from 'react';
import type { UserRole, PingResult, PingSite } from '../types';
import { Trash2, Clock } from 'lucide-react';

interface SiteListCardProps {
    sites: PingSite[];
    onSiteSelect: (url: string) => void;
    onRemoveSite: (url: string) => void;
    userRole: UserRole;
    latestResults: Record<string, PingResult>;
}

const getLimit = (role: UserRole) => {
    switch (role) {
        case 'admin': return 'Unlimited';
        case 'premium': return 20;
        case 'user': return 5;
        default: return 5;
    }
};

const StatusDot: React.FC<{ status?: PingResult['status'] }> = ({ status }) => {
  const baseClasses = "w-2.5 h-2.5 rounded-full flex-shrink-0";
  if (!status) return <div className={`${baseClasses} bg-slate-600`} title="No data"></div>;

  const statusClasses = {
    Online: "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]",
    Offline: "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]",
    Error: "bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.5)]",
  };
  return <div className={`${baseClasses} ${statusClasses[status]}`} title={status}></div>;
};

export const SiteListCard: React.FC<SiteListCardProps> = ({ sites, onSiteSelect, onRemoveSite, userRole, latestResults }) => {
    const limit = getLimit(userRole);

    const handleRemove = (e: React.MouseEvent, url: string) => {
        e.stopPropagation();
        onRemoveSite(url);
    };

    return (
        <div className="bg-light-bg border border-slate-700 rounded-lg p-4 shadow-md w-full h-fit">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-text-main">Monitored Sites</h3>
                <span className="text-sm font-mono bg-slate-900/50 px-3 py-1 rounded-full text-secondary">
                    {sites.length} / {limit}
                </span>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                {sites.length > 0 ? (
                    sites.map((pingSite: PingSite) => {
                        const latestResult = latestResults[pingSite.url];
                        return (
                            <div
                                key={pingSite.url}
                                onClick={() => onSiteSelect(pingSite.url)}
                                className="group flex items-center justify-between p-3 rounded-md transition-all bg-slate-900/50 hover:bg-primary/20 cursor-pointer"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <StatusDot status={latestResult?.status} />
                                    <p className="text-text-main truncate" title={pingSite.url}>
                                        {pingSite.url}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-text-secondary font-mono bg-slate-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {pingSite.frequency}
                                    </span>
                                    <button
                                        onClick={(e) => handleRemove(e, pingSite.url)}
                                        className="text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                        title="Remove site"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p className="text-center text-text-secondary py-4">
                        You haven't pinged any sites yet.
                    </p>
                )}
            </div>
        </div>
    );
};