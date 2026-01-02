import type { CacheMetadata } from '../types';
import { formatCacheTime } from '../services/cache';
import './Header.css';

interface HeaderProps {
    cacheMetadata: CacheMetadata;
    isLoading: boolean;
    onRefresh: () => void;
    showMockToggle?: boolean;
    useMock?: boolean;
    onToggleMock?: (use: boolean) => void;
}

export function Header({ cacheMetadata, isLoading, onRefresh, showMockToggle, useMock, onToggleMock }: HeaderProps) {
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
                {showMockToggle && (
                    <div className="data-mode-toggle">
                        <button
                            type="button"
                            className={`mode-switch ${useMock ? 'mock-active' : 'live-active'}`}
                            onClick={() => onToggleMock?.(!useMock)}
                            aria-label={`Switch to ${useMock ? 'live' : 'mock'} data`}
                        >
                            <span className={`mode-option mode-mock ${useMock ? 'active' : ''}`}>
                                <span className="mode-icon">🧪</span>
                                <span className="mode-label">Mock</span>
                            </span>
                            <span className={`mode-option mode-live ${!useMock ? 'active' : ''}`}>
                                <span className="mode-icon">📡</span>
                                <span className="mode-label">Live</span>
                            </span>
                            <span className="mode-slider" />
                        </button>
                    </div>
                )}

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
