import React from 'react';
import { useAppSettings } from '../hooks/useAppSettings';

export const Logo: React.FC<{ className?: string }> = ({ className }) => {
    const { settings } = useAppSettings();

    if (settings.logoUrl) {
        return (
            <img src={settings.logoUrl} alt="Pynor Logo" className="h-9 w-auto" />
        );
    }

    return (
        <span className={`text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary ${className}`} style={{ fontFamily: 'Orbitron, sans-serif' }}>
            PYNOR
        </span>
    );
};
