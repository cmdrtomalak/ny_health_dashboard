// Health Dashboard Types

export type TrendDirection = 'rising' | 'falling' | 'stable';

export interface TrendData {
    count: number;
    trend: TrendDirection;
    percentChange: number;
}

export interface DiseaseStats {
    name: string;
    currentCount: number;
    // Weekly comparison
    weekAgo: TrendData;
    // Monthly comparison
    monthAgo: TrendData;
    // Two months comparison
    twoMonthsAgo: TrendData;
    // Yearly comparison
    yearAgo: TrendData;
    unit: string;
    lastUpdated: string;
    dataSource?: string;
    sourceUrl?: string;
}

export interface RegionalStats {
    nyc: DiseaseStats[];
    nys: DiseaseStats[];
}

export interface WastewaterSample {
    date: string;
    location: string;
    concentration: number;
    trend: TrendDirection;
    pathogen?: string;
}

export interface WastewaterData {
    samples: WastewaterSample[];
    averageConcentration: number;
    trend: TrendDirection;
    alertLevel: 'low' | 'moderate' | 'high' | 'critical';
    lastUpdated: string;
    pathogens?: string[];
}

export interface VaccinationType {
    name: string;
    currentYear: number;
    fiveYearsAgo: number;
    tenYearsAgo: number;
}

export interface VaccinationData {
    nyc: VaccinationType[];
    nys: VaccinationType[];
    lastUpdated: string;
}

export interface NewsAlert {
    id: string;
    title: string;
    summary: string;
    date: string;
    severity: 'info' | 'warning' | 'critical';
    source: string;
    url?: string;
}

export interface NewsData {
    nyc: NewsAlert[];
    nys: NewsAlert[];
    usa: NewsAlert[];
    lastUpdated: string;
}

export interface CacheMetadata {
    lastFetched: string;
    expiresAt: string;
    isStale: boolean;
}

export interface CachedData<T> {
    data: T;
    metadata: CacheMetadata;
}

export interface DashboardData {
    diseaseStats: RegionalStats;
    wastewaterData: WastewaterData;
    vaccinationData: VaccinationData;
    newsData: NewsData;
    cacheMetadata: CacheMetadata;
}
