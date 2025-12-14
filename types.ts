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

export type PingFrequency = '1min' | '5min' | '15min' | '30min' | '1hr' | '6hr' | '12hr' | '24hr';

export interface PingSite {
  url: string;
  frequency: PingFrequency;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  pingedSites: PingSite[]; // Updated to array of PingSite objects
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
export type AppTheme = 'cyber' | 'classic';

export interface AppSettings {
  logoUrl: string;
  landingContent: LandingPageContent;
  animationStyle: AnimationStyle;
  theme: AppTheme;
}

export type AuditLogAction = 'user_role_change' | 'user_delete' | 'site_add' | 'site_remove';

export interface AuditLog {
    id: string;
    timestamp: Date;
    actorId: string; // UID of the user who performed the action
    actorEmail: string;
    action: AuditLogAction;
    targetId?: string; // e.g., UID of the user being modified
    targetEmail?: string;
    details: any; // e.g., { oldRole: 'user', newRole: 'admin' } or { siteUrl: '...' }
}
