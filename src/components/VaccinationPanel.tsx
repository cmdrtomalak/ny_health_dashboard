import { useState } from 'react';
import type { VaccinationData } from '../types';
import './VaccinationPanel.css';

interface VaccinationPanelProps {
    data: VaccinationData;
}

export function VaccinationPanel({ data }: VaccinationPanelProps) {
    const [activeRegion, setActiveRegion] = useState<'nyc' | 'nys'>('nyc');

    const vaccines = activeRegion === 'nyc' ? data.nyc : data.nys;

    const getComplianceColor = (rate: number) => {
        if (rate >= 90) return '#22c55e';
        if (rate >= 70) return '#f59e0b';
        if (rate >= 50) return '#f97316';
        return '#ef4444';
    };

    const getTrendIcon = (current: number, previous: number) => {
        if (previous === 0) return '🆕';
        const diff = current - previous;
        if (diff > 2) return '📈';
        if (diff < -2) return '📉';
        return '➡️';
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
                            <th className="rate-col">
                                <span className="year-label">2026</span>
                                <span className="year-sublabel">Current</span>
                            </th>
                            <th className="rate-col">
                                <span className="year-label">2021</span>
                                <span className="year-sublabel">5 Years Ago</span>
                            </th>
                            <th className="rate-col">
                                <span className="year-label">2016</span>
                                <span className="year-sublabel">10 Years Ago</span>
                            </th>
                            <th className="trend-col">Trend</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vaccines.map((vaccine, index) => (
                            <tr key={vaccine.name} style={{ animationDelay: `${index * 0.05}s` }}>
                                <td className="vaccine-name">{vaccine.name}</td>
                                <td className="rate-cell">
                                    <div className="rate-wrapper">
                                        {vaccine.currentYear >= 0 ? (
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
                                                    {vaccine.currentYear.toLocaleString()}
                                                    {vaccine.currentYear <= 100 ? '%' : ''}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="rate-na">N/A</span>
                                        )}
                                    </div>
                                </td>
                                <td className="rate-cell">
                                    <div className="rate-wrapper">
                                        {vaccine.fiveYearsAgo > 0 ? (
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
                                <td className="rate-cell">
                                    <div className="rate-wrapper">
                                        {vaccine.tenYearsAgo > 0 ? (
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
                                <td className="trend-cell">
                                    <span className="trend-emoji">
                                        {getTrendIcon(vaccine.currentYear, vaccine.fiveYearsAgo)}
                                    </span>
                                </td>
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
        </div>
    );
}
