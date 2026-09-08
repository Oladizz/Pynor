export type PingStatus = 'Online' | 'Offline' | 'Error';

export interface PingResult {
    id: string;
    url: string;
    status: PingStatus;
    responseTime: number | null;
    timestamp: Date;
    statusCode: number | null;
    statusText: string | null;
    userId?: string;
}

export type PingFrequency = '1min' | '5min' | '15min' | '30min' | '1hr' | '6hr' | '12hr' | '24hr';

export interface AlertConfig {
    telegramChatId?: string;
    telegramBotToken?: string;
    webhookUrl?: string;
    emailAlert?: string;
    enabled: boolean;
}

export interface PingSite {
    url: string;
    name?: string;
    frequency: PingFrequency;
    lastStatus?: PingStatus;
    lastCheckedAt?: string;
    alertConfig?: AlertConfig;
    isPublic?: boolean;
}

export type IncidentStatus = 'ongoing' | 'resolved';

export interface Incident {
    id: string;
    siteUrl: string;
    userId: string;
    status: IncidentStatus;
    startedAt: Date;
    resolvedAt?: Date | null;
    durationSeconds?: number;
    cause: string;
    statusCode?: number | null;
}
