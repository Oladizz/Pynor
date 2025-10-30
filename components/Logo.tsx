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
        <span className={`text-3xl font-bold tracking-tighter text-text-main ${className}`}>
            Pynor
        </span>
    );
};
