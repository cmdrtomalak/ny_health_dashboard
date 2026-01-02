import { useState, useEffect, useCallback } from 'react';
import type { DashboardData } from './types';
import { fetchDashboardData } from './services/api';
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
  const [useMock, setUseMock] = useState(import.meta.env.DEV); // Default to mock in DEV

  const loadData = useCallback(async (forceRefresh = false, mock = useMock) => {
    try {
      setIsLoading(true);
      setError(null);
      const dashboardData = await fetchDashboardData(forceRefresh, mock);
      setData(dashboardData);
    } catch (err) {
      setError('Failed to load health data. Please try again.');
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [useMock]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    loadData(true);
  };

  const handleToggleMock = (val: boolean) => {
    setUseMock(val);
    // Directly reload with new value to ensure sync
    // loadData is dependent on useMock via closure unless we explicitly pass it, 
    // but state setter is async. Better to trigger effect or call explicitly.
    // Easier: update state, effect will trigger? No, effect depends on loadData, 
    // loadData depends on useMock. So yes.
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
          <button className="retry-btn" onClick={() => loadData(true)}>
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
        showMockToggle={import.meta.env.DEV}
        useMock={useMock}
        onToggleMock={handleToggleMock}
      />

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
