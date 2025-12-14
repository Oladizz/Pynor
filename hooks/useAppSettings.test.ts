import { renderHook, act } from '@testing-library/react';
import { AppSettingsProvider, useAppSettings } from './useAppSettings';
import React from 'react';
import { AppSettings, LandingPageContent, AnimationStyle, AppTheme } from '../types';

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

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock document.body.classList
const mockClassList = {
  add: jest.fn(),
  remove: jest.fn(),
  contains: jest.fn(),
};
Object.defineProperty(document.body, 'classList', { value: mockClassList });


describe('useAppSettings', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    // Ensure default body classes are present for removal tests
    mockClassList.add('anim-fade');
    mockClassList.add('theme-cyber');
  });

  it('should load default settings if no settings are in localStorage', () => {
    const { result } = renderHook(() => useAppSettings(), { wrapper: AppSettingsProvider });
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    expect(localStorageMock.getItem(SETTINGS_KEY)).toEqual(JSON.stringify(DEFAULT_SETTINGS));
  });

  it('should load settings from localStorage if available', () => {
    const customSettings = { ...DEFAULT_SETTINGS, logoUrl: 'http://custom.logo', theme: 'classic' as AppTheme };
    localStorageMock.setItem(SETTINGS_KEY, JSON.stringify(customSettings));

    const { result } = renderHook(() => useAppSettings(), { wrapper: AppSettingsProvider });
    expect(result.current.settings).toEqual(customSettings);
  });

  it('should update logoUrl correctly', () => {
    const { result } = renderHook(() => useAppSettings(), { wrapper: AppSettingsProvider });
    const newLogoUrl = 'http://newlogo.png';

    act(() => {
      result.current.updateLogoUrl(newLogoUrl);
    });

    expect(result.current.settings.logoUrl).toBe(newLogoUrl);
    expect(localStorageMock.getItem(SETTINGS_KEY)).toContain(newLogoUrl);
  });

  it('should update landingContent correctly', () => {
    const { result } = renderHook(() => useAppSettings(), { wrapper: AppSettingsProvider });
    const newContent = { ...DEFAULT_LANDING_CONTENT, heroTitle: 'New Title' };

    act(() => {
      result.current.updateLandingContent(newContent);
    });

    expect(result.current.settings.landingContent).toEqual(newContent);
    expect(localStorageMock.getItem(SETTINGS_KEY)).toContain('New Title');
  });

  it('should update animationStyle correctly and apply class to body', () => {
    const { result } = renderHook(() => useAppSettings(), { wrapper: AppSettingsProvider });
    const newStyle: AnimationStyle = 'slide';

    act(() => {
      result.current.updateAnimationStyle(newStyle);
    });

    expect(result.current.settings.animationStyle).toBe(newStyle);
    expect(localStorageMock.getItem(SETTINGS_KEY)).toContain(newStyle);
    expect(mockClassList.remove).toHaveBeenCalledWith('anim-fade', 'anim-slide', 'anim-none');
    expect(mockClassList.add).toHaveBeenCalledWith('anim-slide');
  });

  it('should toggle theme correctly and apply class to body', () => {
    const { result } = renderHook(() => useAppSettings(), { wrapper: AppSettingsProvider });

    // Initial theme is cyber
    expect(result.current.settings.theme).toBe('cyber');
    expect(mockClassList.add).toHaveBeenCalledWith('theme-cyber');

    act(() => {
      result.current.toggleTheme();
    });

    // Theme should be classic
    expect(result.current.settings.theme).toBe('classic');
    expect(localStorageMock.getItem(SETTINGS_KEY)).toContain('classic');
    expect(mockClassList.remove).toHaveBeenCalledWith('theme-cyber', 'theme-classic');
    expect(mockClassList.add).toHaveBeenCalledWith('theme-classic');

    act(() => {
      result.current.toggleTheme();
    });

    // Theme should revert to cyber
    expect(result.current.settings.theme).toBe('cyber');
    expect(localStorageMock.getItem(SETTINGS_KEY)).toContain('cyber');
    expect(mockClassList.remove).toHaveBeenCalledWith('theme-cyber', 'theme-classic');
    expect(mockClassList.add).toHaveBeenCalledWith('theme-cyber');
  });

  it('should throw error if useAppSettings is not used within AppSettingsProvider', () => {
    const { result } = renderHook(() => useAppSettings());
    expect(result.error).toEqual(Error('useAppSettings must be used within an AppSettingsProvider'));
  });
});
