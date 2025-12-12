import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { AppSettings, LandingPageContent, AnimationStyle, AppTheme } from '../types';

const SETTINGS_KEY = 'pynor_app_settings';

const DEFAULT_LANDING_CONTENT: LandingPageContent = {
  heroTitle: 'Global Site Monitoring',
  heroSubtitle: "Pynor delivers precision monitoring with a futuristic edge. Track availability, latency, and uptime in real-time.",
  feature1Title: 'Instant Pings',
  feature1Description: 'Zero-latency checks on your infrastructure status globally.',
  feature2Title: 'Data Retention',
  feature2Description: 'Comprehensive history logs to analyze performance trends.',
  feature3Title: 'AI Analysis',
  feature3Description: 'Gemini-powered insights into your network health.',
};

const DEFAULT_SETTINGS: AppSettings = {
  logoUrl: '',
  landingContent: DEFAULT_LANDING_CONTENT,
  animationStyle: 'fade',
  theme: 'cyber',
};


interface AppSettingsContextType {
    settings: AppSettings;
    updateLogoUrl: (url: string) => void;
    updateLandingContent: (content: LandingPageContent) => void;
    updateAnimationStyle: (style: AnimationStyle) => void;
    toggleTheme: () => void;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

    useEffect(() => {
        try {
            const storedSettings = localStorage.getItem(SETTINGS_KEY);
            if (storedSettings) {
                // Merge with default in case new keys (like theme) were added
                setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) });
            } else {
                 localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
            }
        } catch (error) {
            console.error("Failed to load app settings:", error);
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
        }
    }, []);

    // Apply Animation Classes
    useEffect(() => {
        document.body.classList.remove('anim-fade', 'anim-slide', 'anim-none');
        document.body.classList.add(`anim-${settings.animationStyle}`);
    }, [settings.animationStyle]);

    // Apply Theme Classes
    useEffect(() => {
        document.body.classList.remove('theme-cyber', 'theme-classic');
        document.body.classList.add(`theme-${settings.theme}`);
    }, [settings.theme]);

    const updateLogoUrl = useCallback((url: string) => {
        setSettings(prevSettings => {
            const newSettings = { ...prevSettings, logoUrl: url };
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
            return newSettings;
        });
    }, []);

    const updateLandingContent = useCallback((content: LandingPageContent) => {
        setSettings(prevSettings => {
            const newSettings = { ...prevSettings, landingContent: content };
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
            return newSettings;
        });
    }, []);
    
    const updateAnimationStyle = useCallback((style: AnimationStyle) => {
        setSettings(prevSettings => {
            const newSettings = { ...prevSettings, animationStyle: style };
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
            return newSettings;
        });
    }, []);

    const toggleTheme = useCallback(() => {
        setSettings(prevSettings => {
            const newTheme = prevSettings.theme === 'cyber' ? 'classic' : 'cyber';
            const newSettings = { ...prevSettings, theme: newTheme };
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
            return newSettings;
        });
    }, []);

    const value = { settings, updateLogoUrl, updateLandingContent, updateAnimationStyle, toggleTheme };
    
    return (
        <AppSettingsContext.Provider value={value}>
            {children}
        </AppSettingsContext.Provider>
    );
};

export const useAppSettings = () => {
    const context = useContext(AppSettingsContext);
    if (context === undefined) {
        throw new Error('useAppSettings must be used within an AppSettingsProvider');
    }
    return context;
}
