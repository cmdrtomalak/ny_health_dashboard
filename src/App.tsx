import { useState, useEffect, useCallback } from 'react';
import type { DashboardData } from './types';
import { api } from './services/api';
import { realtimeService } from './services/realtimeService';
import { Header } from './components/Header';
import { NewsAlertPanel } from './components/NewsAlertPanel';
import { StatsCarousel } from './components/StatsCarousel';
import { WastewaterMonitor } from './components/WastewaterMonitor';
import { VaccinationPanel } from './components/VaccinationPanel';
import { LoadingSpinner } from './components/LoadingSpinner';
import './App.css';

function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      if (!data) setIsLoading(true);
      setError(null);
      const dashboardData = await api.fetchDashboardData();
      setData(dashboardData);
    } catch (err) {
      setError('Failed to load health data. Please try again.');
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [data]);

  useEffect(() => {
    loadData();

    const unsubscribe = realtimeService.subscribe((message) => {
      if (message.type === 'sync_status') {
        setSyncStatus(message.message || message.status);
        if (message.status === 'success') {
          loadData();
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadData]);

  const handleRefresh = async () => {
    try {
      const result = await api.requestRefresh();
      setSyncStatus(result.message);
      if (result.status === 'scheduled') {
      }
    } catch (err) {
      console.error('Refresh request failed', err);
      setSyncStatus('Failed to request refresh');
    }
  };

  if (isLoading && !data) {
    return (
      <div className="app">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="app">
        <div className="error-container">
          <span className="error-icon">⚠️</span>
          <h2>Unable to Load Data</h2>
          <p>{error}</p>
          <button className="retry-btn" onClick={() => loadData()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="app">
      <Header
        cacheMetadata={data.cacheMetadata}
        isLoading={isLoading}
        onRefresh={handleRefresh}
        showMockToggle={false}
        useMock={false}
        onToggleMock={() => {}}
      />
      
      {syncStatus && (
        <div className="sync-status-toast">
          {syncStatus}
          <button onClick={() => setSyncStatus(null)}>×</button>
        </div>
      )}

      <main className="dashboard-main">
        {/* Health News Alerts - Top Section */}
        <section className="dashboard-section news-section">
          <NewsAlertPanel newsData={data.newsData} />
        </section>

        {/* Disease Statistics - NYC and NYS side by side */}
        <section className="dashboard-section stats-section">
          <div className="section-header">
            <h2 className="section-title">
              <span className="section-icon">📊</span>
              Disease Surveillance
            </h2>
            <p className="section-subtitle">Weekly case counts and trends</p>
          </div>

          <div className="stats-regions">
            <StatsCarousel
              title="New York City"
              icon="🗽"
              stats={data.diseaseStats.nyc}
              region="NYC"
            />
          </div>
        </section>

        {/* Wastewater and Vaccination - Two columns */}
        <section className="dashboard-section monitoring-section">
          <div className="monitoring-grid">
            <WastewaterMonitor data={data.wastewaterData} />
            <VaccinationPanel data={data.vaccinationData} />
          </div>
        </section>

        {/* Footer */}
        <footer className="dashboard-footer">
          <p>
            Data sources: NYC Department of Health and Mental Hygiene,
            NY State Department of Health, CDC
          </p>
          <p className="disclaimer">
            This dashboard displays simulated data for demonstration purposes.
            For official health information, visit{' '}
            <a href="https://www.nyc.gov/health" target="_blank" rel="noopener noreferrer">
              nyc.gov/health
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}

export default App;
