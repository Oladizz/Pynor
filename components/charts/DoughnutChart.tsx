import React from 'react';

interface DoughnutChartProps {
    data: Array<{
        label: string;
        value: number;
        color: string;
    }>;
}

const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
};

const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number): string => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    // Ensure arc is drawn even for full circle
    if (endAngle - startAngle >= 360) {
        return [
            "M", start.x, start.y,
            "A", radius, radius, 0, 1, 0, end.x - 0.01, end.y
        ].join(" ");
    }
    return [
        "M", start.x, start.y,
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
};


export const DoughnutChart: React.FC<DoughnutChartProps> = ({ data }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
        return <p className="text-text-secondary text-center py-8">No data to display.</p>;
    }

    let startAngle = 0;

    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 animate-entry">
            <svg viewBox="0 0 100 100" className="w-40 h-40 transform -rotate-90">
                {data.map((item) => {
                    const angle = (item.value / total) * 360;
                    // Prevent angle from being 360 to avoid rendering issues with arcs
                    const endAngle = startAngle + (angle >= 360 ? 359.99 : angle);
                    const gap = data.length > 1 ? 2 : 0; // Add gap only if multiple segments
                    const pathData = describeArc(50, 50, 40, startAngle, endAngle - gap);
                    const animationDelay = `${Math.random() * 200}ms`;
                    startAngle = endAngle;
                    
                    return (
                        <path
                            key={item.label}
                            d={pathData}
                            fill="none"
                            stroke={item.color}
                            strokeWidth="20"
                            strokeLinecap="round"
                            className="transition-all duration-500 origin-center"
                            style={{ animation: `fade-in-down 0.5s ease-out ${animationDelay} forwards`, opacity: 0 }}
                        />
                    );
                })}
            </svg>
            <div className="space-y-2 text-sm">
                {data.map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }}></div>
                        <span className="text-text-secondary capitalize">{item.label}</span>
                        <span className="font-mono text-text-main">{((item.value / total) * 100).toFixed(0)}%</span>
                        <span className="text-text-secondary">({item.value})</span>
                    </div>
                ))}
            </div>
        </div>
    );
};