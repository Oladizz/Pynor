import React from 'react';

interface BarChartProps {
    data: Array<{
        label: string;
        value: number;
    }>;
}

export const BarChart: React.FC<BarChartProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <p className="text-text-secondary text-center py-4">No sites have been pinged yet.</p>;
    }
    
    const maxValue = Math.max(...data.map(item => item.value), 0);
    const scale = maxValue > 0 ? 100 / maxValue : 0;

    return (
        <div className="space-y-3">
            {data.map((item, index) => (
                <div key={item.label} className="group flex items-center gap-3 animate-entry" style={{ animationDelay: `${index * 100}ms`}}>
                    <p className="text-sm text-text-secondary w-1/4 truncate text-right" title={item.label}>
                        {item.label}
                    </p>
                    <div className="flex-grow bg-slate-800/50 rounded-full h-6 p-1">
                        <div
                            className="bg-gradient-to-r from-primary to-blue-400 h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2"
                            style={{ width: `${item.value * scale}%` }}
                        >
                           <span className="text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                               {item.value}
                           </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};