export type PingStatus = 'Online' | 'Offline' | 'Error';

export interface PingResult {
  id: string;
  url: string;
  status: PingStatus;
  responseTime: number | null;
  timestamp: Date;
  statusCode: number | null;
  statusText: string | null;
}

export type UserRole = 'user' | 'premium' | 'admin';

export interface User {
  id: string;
  email: string;
  passwordHash: string; // In a real app, this would be a proper hash.
  role: UserRole;
  pingedSites: string[];
  createdAt: string; // ISO Date string
}

export interface LandingPageContent {
  heroTitle: string;
  heroSubtitle: string;
  feature1Title: string;
  feature1Description: string;
  feature2Title: string;
  feature2Description: string;
  feature3Title: string;
  feature3Description: string;
}

export type AnimationStyle = 'fade' | 'slide' | 'none';

export interface AppSettings {
  logoUrl: string;
  landingContent: LandingPageContent;
  animationStyle: AnimationStyle;
}