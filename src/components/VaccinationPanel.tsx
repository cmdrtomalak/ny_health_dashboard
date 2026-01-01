import { useState } from 'react';
import type { VaccinationData, VaccinationType } from '../types';
import './VaccinationPanel.css';

interface VaccinationPanelProps {
    data: VaccinationData;
}

export function VaccinationPanel({ data }: VaccinationPanelProps) {
    const [activeRegion, setActiveRegion] = useState<'nyc' | 'nys'>('nyc');
    const [selectedVaccine, setSelectedVaccine] = useState<VaccinationType | null>(null);

    const vaccines = activeRegion === 'nyc' ? data.nyc : data.nys;

    // Determine column visibility
    const hasData2025 = vaccines.some(v => v.currentYear > 0);
    const hasData2021 = vaccines.some(v => v.fiveYearsAgo > -1);
    const hasData2016 = vaccines.some(v => v.tenYearsAgo > -1);
    // Show seasonal data column if any vaccine has lastAvailableRate
    const hasSeasonalData = vaccines.some(v => v.lastAvailableRate !== undefined && v.lastAvailableRate > 0);
    // Check if a rate is a dose count (> 100 means it's a dose count, not a percentage)
    const isDoseCount = (rate: number | undefined) => rate !== undefined && rate > 100;

    // Format large dose counts compactly (e.g., 1.2M, 3.1M)
    const formatDoseCount = (count: number): string => {
        if (count >= 1_000_000) {
            return `${(count / 1_000_000).toFixed(1)}M`;
        }
        if (count >= 1_000) {
            return `${(count / 1_000).toFixed(0)}K`;
        }
        return count.toLocaleString();
    };

    const getComplianceColor = (rate: number) => {
        if (rate >= 90) return '#22c55e';
        if (rate >= 70) return '#f59e0b';
        if (rate >= 50) return '#f97316';
        return '#ef4444';
    };

    return (
        <div className="vaccination-panel">
            <div className="vaccination-header">
                <div className="vaccination-title-group">
                    <span className="vaccination-icon">💉</span>
                    <div>
                        <h2 className="vaccination-title">Vaccination Rates</h2>
                        <p className="vaccination-subtitle">Compliance comparison across years</p>
                    </div>
                </div>

                <div className="region-toggle">
                    <button
                        className={`toggle-btn ${activeRegion === 'nyc' ? 'active' : ''}`}
                        onClick={() => setActiveRegion('nyc')}
                    >
                        NYC
                    </button>
                    <button
                        className={`toggle-btn ${activeRegion === 'nys' ? 'active' : ''}`}
                        onClick={() => setActiveRegion('nys')}
                    >
                        NYS
                    </button>
                </div>
            </div>

            <div className="vaccination-table-container">
                <table className="vaccination-table">
                    <thead>
                        <tr>
                            <th className="vaccine-name-col">Vaccine</th>
                            {hasData2025 && (
                                <th className="rate-col">
                                    <span className="year-label">2025</span>
                                    <span className="year-sublabel">Current</span>
                                </th>
                            )}
                            {hasSeasonalData && (
                                <th className="rate-col">
                                    <span className="year-label">Season</span>
                                    <span className="year-sublabel">Data</span>
                                </th>
                            )}
                            {hasData2021 && (
                                <th className="rate-col">
                                    <span className="year-label">2021</span>
                                    <span className="year-sublabel">5 Years Ago</span>
                                </th>
                            )}
                            {hasData2016 && (
                                <th className="rate-col">
                                    <span className="year-label">2016</span>
                                    <span className="year-sublabel">10 Years Ago</span>
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {vaccines.map((vaccine, index) => (
                            <tr key={vaccine.name} style={{ animationDelay: `${index * 0.05}s` }}>
                                <td className="vaccine-name">
                                    {vaccine.name}
                                    {vaccine.isReportingStopped && <span className="stopped-badge">Reporting Stopped</span>}
                                </td>

                                {/* Current Rate */}
                                {hasData2025 && (
                                    <td className="rate-cell" onClick={() => setSelectedVaccine(vaccine)} title="Click for details" style={{ cursor: 'pointer' }}>
                                        <div className="rate-wrapper">
                                            {vaccine.currentYear > 0 ? (
                                                <>
                                                    {vaccine.currentYear <= 100 && (
                                                        <div
                                                            className="rate-bar"
                                                            style={{
                                                                width: `${vaccine.currentYear}%`,
                                                                background: getComplianceColor(vaccine.currentYear)
                                                            }}
                                                        />
                                                    )}
                                                    <span className="rate-value">
                                                        {vaccine.currentYear.toLocaleString()}%
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="rate-na">{vaccine.lastAvailableRate ? '-' : 'N/A'}</span>
                                            )}
                                        </div>
                                    </td>
                                )}

                                {/* Season Data (Doses or Rates) - with inline progress bar for percentages */}
                                {hasSeasonalData && (
                                    <td className="rate-cell" onClick={() => setSelectedVaccine(vaccine)} title="Click for details" style={{ cursor: 'pointer' }}>
                                        <div className="rate-wrapper">
                                            {vaccine.lastAvailableRate !== undefined && vaccine.lastAvailableRate > 0 ? (
                                                <>
                                                    {/* Show progress bar only for percentage values (≤100) */}
                                                    {!isDoseCount(vaccine.lastAvailableRate) && (
                                                        <div
                                                            className="rate-bar"
                                                            style={{
                                                                width: `${vaccine.lastAvailableRate}%`,
                                                                background: getComplianceColor(vaccine.lastAvailableRate)
                                                            }}
                                                        />
                                                    )}
                                                    <span className="rate-value" style={{ fontWeight: 600 }}>
                                                        {isDoseCount(vaccine.lastAvailableRate)
                                                            ? formatDoseCount(vaccine.lastAvailableRate)
                                                            : `${vaccine.lastAvailableRate}%`}
                                                    </span>
                                                    {isDoseCount(vaccine.lastAvailableRate) && (
                                                        <span className="sub-value" style={{ fontSize: '0.65em', display: 'inline', color: '#888', marginLeft: '4px' }}>
                                                            doses
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="rate-na">-</span>
                                            )}
                                        </div>
                                    </td>
                                )}

                                {/* Historical Data */}
                                {hasData2021 && (
                                    <td className="rate-cell">
                                        <div className="rate-wrapper">
                                            {vaccine.fiveYearsAgo > -1 ? (
                                                <>
                                                    <div
                                                        className="rate-bar rate-bar-faded"
                                                        style={{
                                                            width: `${vaccine.fiveYearsAgo}%`,
                                                            background: getComplianceColor(vaccine.fiveYearsAgo)
                                                        }}
                                                    />
                                                    <span className="rate-value">{vaccine.fiveYearsAgo}%</span>
                                                </>
                                            ) : (
                                                <span className="rate-na">N/A</span>
                                            )}
                                        </div>
                                    </td>
                                )}

                                {hasData2016 && (
                                    <td className="rate-cell">
                                        <div className="rate-wrapper">
                                            {vaccine.tenYearsAgo > -1 ? (
                                                <>
                                                    <div
                                                        className="rate-bar rate-bar-faded"
                                                        style={{
                                                            width: `${vaccine.tenYearsAgo}%`,
                                                            background: getComplianceColor(vaccine.tenYearsAgo)
                                                        }}
                                                    />
                                                    <span className="rate-value">{vaccine.tenYearsAgo}%</span>
                                                </>
                                            ) : (
                                                <span className="rate-na">N/A</span>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="vaccination-legend">
                <div className="legend-item">
                    <span className="legend-color" style={{ background: '#22c55e' }}></span>
                    <span className="legend-label">≥90% (Excellent)</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color" style={{ background: '#f59e0b' }}></span>
                    <span className="legend-label">70-89% (Good)</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color" style={{ background: '#f97316' }}></span>
                    <span className="legend-label">50-69% (Fair)</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color" style={{ background: '#ef4444' }}></span>
                    <span className="legend-label">&lt;50% (Low)</span>
                </div>
            </div>

            {/* Data Info Modal */}
            {selectedVaccine && (
                <div className="modal-overlay" onClick={() => setSelectedVaccine(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setSelectedVaccine(null)}>×</button>
                        <h3 className="modal-title">{selectedVaccine.name}</h3>
                        <div className="modal-body">
                            <div className="modal-row">
                                <span className="modal-label">Collection Method:</span>
                                <span className="modal-value">{selectedVaccine.collectionMethod || 'Unknown'}</span>
                            </div>

                            {selectedVaccine.calculationDetails && (
                                <>
                                    <div className="modal-section-title">Data Details</div>

                                    {/* Only show vaccinated count if available (for dose-based data like COVID/Flu) */}
                                    {selectedVaccine.calculationDetails.numerator > 0 && (
                                        <div className="modal-row">
                                            <span className="modal-label">📊 Total Doses Administered:</span>
                                            <span className="modal-value" style={{ fontWeight: 600, color: '#22c55e' }}>
                                                {selectedVaccine.calculationDetails.numerator.toLocaleString()}
                                            </span>
                                        </div>
                                    )}

                                    {/* Only show population if available */}
                                    {selectedVaccine.calculationDetails.denominator > 0 && (
                                        <div className="modal-row">
                                            <span className="modal-label">👥 Target Population:</span>
                                            <span className="modal-value">
                                                {selectedVaccine.calculationDetails.denominator.toLocaleString()}
                                            </span>
                                        </div>
                                    )}

                                    <div className="modal-row">
                                        <span className="modal-label">📐 Calculation:</span>
                                        <code className="modal-code">{selectedVaccine.calculationDetails.logic}</code>
                                    </div>
                                    <div className="modal-row">
                                        <span className="modal-label">📁 Data Source:</span>
                                        <div className="modal-value" style={{ fontSize: '0.9em', color: '#555' }}>
                                            {selectedVaccine.calculationDetails.sourceLocation}
                                        </div>
                                    </div>
                                </>
                            )}

                            {selectedVaccine.sourceUrl && (
                                <div className="modal-row" style={{ marginTop: '1rem' }}>
                                    <a href={selectedVaccine.sourceUrl} target="_blank" rel="noopener noreferrer" className="modal-link">
                                        View Data Source ↗
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
