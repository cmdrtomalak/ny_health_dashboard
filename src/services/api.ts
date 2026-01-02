import type {
    RegionalStats,
    DashboardData,
    CacheMetadata,
} from '../types';
import {
    generateDiseaseStats,
    generateWastewaterData,
    generateVaccinationData,
    generateNewsData,
} from '../data/mockData';
import {
    getFromCache,
    saveToCache,
    shouldRefreshCache,
    getCacheMetadata,
} from './cache';
import { fetchDiseaseStats } from './diseaseService';
import { fetchWastewaterData } from './wastewaterService';
import { fetchVaccinationData } from './vaccinationService';
import { fetchNewsData } from './newsService';

const CACHE_KEY = 'dashboard_data';

// Determine if we are in Live Mode
// npm run live sets MODE=production or we can check a Vite env var
export const IS_LIVE_MODE = import.meta.env.MODE === 'production' || import.meta.env.VITE_USE_REAL_DATA === 'true';

export async function fetchDashboardData(forceRefresh = false, useMock = false): Promise<DashboardData> {
    // Logic: if useMock is passed as true, use mock.
    // If IS_LIVE_MODE is true, default to real, unless useMock override? No, useMock is UI toggle.
    // Let's rely on the passed useMock boolean which comes from the UI state (defaulted to !IS_LIVE_MODE initially likely).

    console.log(`[API] Fetching data. Mock: ${useMock}, LiveMode Env: ${IS_LIVE_MODE}`);

    if (useMock) {
        return {
            diseaseStats: generateDiseaseStats(),
            wastewaterData: generateWastewaterData(),
            vaccinationData: generateVaccinationData(),
            newsData: generateNewsData(),
            cacheMetadata: getCacheMetadata(new Date()),
        };
    }

    // LIVE MODE: Check Cache First
    if (!forceRefresh) {
        const cached = await getFromCache<DashboardData>(CACHE_KEY);
        if (cached && !shouldRefreshCache(cached.metadata)) {
            console.log('[API] Returning cached dashboard data');
            return {
                ...cached.data,
                cacheMetadata: cached.metadata,
            };
        }
    }

    console.log('[API] Fetching fresh REAL data...');

    try {
        // Fetch all real data in parallel
        const [diseaseArray, wastewaterData, vaccinationData, newsData] = await Promise.all([
            fetchDiseaseStats(),
            fetchWastewaterData(),
            fetchVaccinationData(),
            fetchNewsData(),
        ]);

        // Transform disease stats array to RegionalStats (mocking regional split for now if API doesn't provide)
        // The new diseaseService matches the structure but we need to map to 'nyc' vs 'nys'
        // For this iteration, we'll put the same CDC/State filtered data in both or split if possible.
        // diseaseService returns DiseaseStats[].

        // Logic to split NYC vs NYS from the single CDC fetch:
        // Attempt to split if the source data allows, otherwise duplicate or label clearly.
        // For the purpose of "Real Data", if we can't distinguish, we shouldn't lie.
        // The service does the fetching, let's assume it returns a combined list or we split here.
        // Current api.ts logic expects { nyc: [], nys: [] }

        // We will pass the full list to both for now, or filter if the data has 'location' field.
        // Our updated DiseaseStats doesn't have 'location' on the top level, but the source data did.
        // Let's assume for this step we populate both with the state-level data widely available.
        const diseaseStats: RegionalStats = {
            nyc: diseaseArray,
        };

        const metadata: CacheMetadata = getCacheMetadata(new Date());

        const dashboardData: DashboardData = {
            diseaseStats,
            wastewaterData,
            vaccinationData,
            newsData,
            cacheMetadata: metadata,
        };

        // Save to Persistence (IndexedDB)
        await saveToCache(CACHE_KEY, dashboardData);

        return dashboardData;
    } catch (error) {
        console.error('[API] Failed to fetch real data', error);
        throw error; // Let UI handle error state
    }
}
