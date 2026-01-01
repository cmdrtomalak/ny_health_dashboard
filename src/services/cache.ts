// IndexedDB Cache Service using idb-keyval
import { get, set, del, keys } from 'idb-keyval';
import type { CacheMetadata, CachedData } from '../types';

const CACHE_KEY_PREFIX = 'nyc_health_dashboard_';
const REFRESH_HOUR = 10; // 10 AM local time

export function shouldRefreshCache(metadata: CacheMetadata): boolean {
    const now = new Date();
    const lastFetched = new Date(metadata.lastFetched);
    const currentHour = now.getHours();

    // Check if we're past 10 AM today
    const isPastRefreshHour = currentHour >= REFRESH_HOUR;

    // Check if we've already fetched today after 10 AM
    const fetchedToday = lastFetched.toDateString() === now.toDateString();
    const fetchedAfterRefreshHour = lastFetched.getHours() >= REFRESH_HOUR;

    // If it's past 10 AM and we haven't fetched today after 10 AM, refresh
    if (isPastRefreshHour && !(fetchedToday && fetchedAfterRefreshHour)) {
        return true;
    }

    // If last fetch was before today, and it's past 10 AM, refresh
    if (!fetchedToday && isPastRefreshHour) {
        return true;
    }

    return false;
}

export function getCacheMetadata(lastFetched: Date): CacheMetadata {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(REFRESH_HOUR, 0, 0, 0);

    return {
        lastFetched: lastFetched.toISOString(),
        expiresAt: tomorrow.toISOString(),
        isStale: shouldRefreshCache({
            lastFetched: lastFetched.toISOString(),
            expiresAt: tomorrow.toISOString(),
            isStale: false
        })
    };
}

export async function saveToCache<T>(key: string, data: T): Promise<CachedData<T>> {
    const metadata = getCacheMetadata(new Date());
    const cached: CachedData<T> = { data, metadata };

    try {
        await set(CACHE_KEY_PREFIX + key, cached);
    } catch (e) {
        console.warn('Failed to save to cache:', e);
    }

    return cached;
}

export async function getFromCache<T>(key: string): Promise<CachedData<T> | null> {
    try {
        const cached = await get<CachedData<T>>(CACHE_KEY_PREFIX + key);
        if (!cached) return null;

        // Update isStale flag
        cached.metadata.isStale = shouldRefreshCache(cached.metadata);
        return cached;
    } catch (e) {
        console.warn('Failed to read from cache:', e);
        // Fallback to try and clear potential corrupt data
        try { await del(CACHE_KEY_PREFIX + key); } catch { /* ignore */ }
        return null;
    }
}

export async function clearCache(): Promise<void> {
    try {
        const allKeys = await keys();
        const appKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(CACHE_KEY_PREFIX));
        await Promise.all(appKeys.map(k => del(k)));
    } catch (e) {
        console.error('Failed to clear cache', e);
    }
}

export function formatCacheTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}
