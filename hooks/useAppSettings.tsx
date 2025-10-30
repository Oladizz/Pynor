import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { AppSettings, LandingPageContent, AnimationStyle } from '../types';

const SETTINGS_KEY = 'pynor_app_settings';

const DEFAULT_LANDING_CONTENT: LandingPageContent = {
  heroTitle: 'Simple, Fast, and Elegant',
  heroSubtitle: "Pynor is a modern, sleek service to monitor any website's availability and performance with just a click. Get real-time feedback and historical data, all in one place.",
  feature1Title: 'Real-time Pinging',
  feature1Description: 'Instantly check the status, response time, and availability of any website from our global network.',
  feature2Title: 'Detailed History & Stats',
  feature2Description: 'Track the performance of your sites over time with a detailed, chronological history and uptime statistics for each one.',
  feature3Title: 'AI-Powered Insights',
  feature3Description: 'Leverage the power of Gemini to analyze your ping data and get intelligent summaries and suggestions.',
};

const DEFAULT_SETTINGS: AppSettings = {
  logoUrl: '',
  landingContent: DEFAULT_LANDING_CONTENT,
  animationStyle: 'fade',
};


interface AppSettingsContextType {
    settings: AppSettings;
    updateLogoUrl: (url: string) => void;
    updateLandingContent: (content: LandingPageContent) => void;
    updateAnimationStyle: (style: AnimationStyle) => void;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

export const AppSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

    useEffect(() => {
        try {
            const storedSettings = localStorage.getItem(SETTINGS_KEY);
            if (storedSettings) {
                setSettings(JSON.parse(storedSettings));
            } else {
                 localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
            }
        } catch (error) {
            console.error("Failed to load app settings:", error);
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
        }
    }, []);

    useEffect(() => {
        // Remove old animation classes and add the current one to the body
        document.body.classList.remove('anim-fade', 'anim-slide', 'anim-none');
        document.body.classList.add(`anim-${settings.animationStyle}`);
    }, [settings.animationStyle]);

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

    const value = { settings, updateLogoUrl, updateLandingContent, updateAnimationStyle };
    
    return React.createElement(AppSettingsContext.Provider, { value }, children);
};

export const useAppSettings = () => {
    const context = useContext(AppSettingsContext);
    if (context === undefined) {
        throw new Error('useAppSettings must be used within an AppSettingsProvider');
    }
    return context;
}