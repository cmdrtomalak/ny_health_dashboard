import type { CacheMetadata } from '../types';
import { formatCacheTime } from '../services/cache';
import './Header.css';

interface HeaderProps {
    cacheMetadata: CacheMetadata;
    isLoading: boolean;
    onRefresh: () => void;
}

export function Header({ cacheMetadata, isLoading, onRefresh }: HeaderProps) {
    return (
        <header className="dashboard-header">
            <div className="header-left">
                <div className="logo-group">
                    <span className="logo-icon">🏥</span>
                    <div className="logo-text">
                        <h1 className="dashboard-title">NYC/NYS Public Health Dashboard</h1>
                        <p className="dashboard-subtitle">Real-time disease surveillance & health metrics</p>
                    </div>
                </div>
            </div>

            <div className="header-right">
                <div className="cache-indicator">
                    <div className="cache-status">
                        <span className={`status-dot ${cacheMetadata.isStale ? 'stale' : 'fresh'}`}></span>
                        <span className="cache-label">
                            {cacheMetadata.isStale ? 'Cached (update available)' : 'Data current'}
                        </span>
                    </div>
                    <span className="last-updated">
                        Last updated: {formatCacheTime(cacheMetadata.lastFetched)}
                    </span>
                </div>

                <button
                    className={`refresh-btn ${isLoading ? 'loading' : ''}`}
                    onClick={onRefresh}
                    disabled={isLoading}
                    title="Refresh data"
                >
                    <span className="refresh-icon">🔄</span>
                    <span className="refresh-text">{isLoading ? 'Refreshing...' : 'Refresh'}</span>
                </button>
            </div>
        </header>
    );
}
