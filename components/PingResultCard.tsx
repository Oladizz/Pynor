

import React from 'react';
import type { PingResult } from '../types';

interface PingResultCardProps {
  result: PingResult;
}

const StatusIndicator: React.FC<{ status: PingResult['status'] }> = ({ status }) => {
  const baseClasses = "w-3 h-3 rounded-full";
  const statusClasses = {
    Online: "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]",
    Offline: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]",
    Error: "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]",
  };
  return <div className={`${baseClasses} ${statusClasses[status]}`}></div>;
};

export const PingResultCard: React.FC<PingResultCardProps> = ({ result }) => {
  return (
    <div className="bg-light-bg border border-slate-700 rounded-lg p-4 shadow-md w-full animate-entry">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-grow overflow-hidden">
          <p className="text-lg font-semibold text-text-main truncate" title={result.url}>
            {result.url}
          </p>
          <p className="text-sm text-text-secondary">
            {result.timestamp.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2 text-text-main text-sm font-medium bg-slate-900/50 px-3 py-1 rounded-full">
          <StatusIndicator status={result.status} />
          <span>{result.status}</span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        <div className="bg-slate-900/50 p-3 rounded-md">
          <p className="text-xs text-text-secondary uppercase tracking-wider">Response Time</p>
          <p className="text-xl font-mono font-bold text-secondary">
            {result.responseTime !== null ? `${result.responseTime}ms` : 'N/A'}
          </p>
        </div>
        <div className="bg-slate-900/50 p-3 rounded-md">
          <p className="text-xs text-text-secondary uppercase tracking-wider">Status Code</p>
          <p className="text-xl font-mono font-bold text-text-main">
            {result.statusCode ?? 'N/A'}
          </p>
        </div>
        <div className="bg-slate-900/50 p-3 rounded-md">
          <p className="text-xs text-text-secondary uppercase tracking-wider">Status Text</p>
          <p className="text-sm font-mono text-text-main truncate pt-2" title={result.statusText ?? 'N/A'}>
            {result.statusText ?? 'N/A'}
          </p>
        </div>
      </div>
    </div>
  );
};