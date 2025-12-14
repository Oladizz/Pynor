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

export type PingFrequency = '1min' | '5min' | '15min' | '30min' | '1hr' | '6hr' | '12hr' | '24hr';

export interface PingSite {
  url: string;
  frequency: PingFrequency;
}
