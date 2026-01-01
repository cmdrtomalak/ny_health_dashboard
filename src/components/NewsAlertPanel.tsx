import { useState } from 'react';
import type { NewsData, NewsAlert } from '../types';
import './NewsAlertPanel.css';

interface NewsAlertPanelProps {
    newsData: NewsData;
}

function NewsItem({ alert }: { alert: NewsAlert }) {
    const getSeverityIcon = () => {
        switch (alert.severity) {
            case 'critical':
                return '🚨';
            case 'warning':
                return '⚠️';
            case 'info':
                return 'ℹ️';
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className={`news-item news-${alert.severity}`}>
            <div className="news-item-header">
                <span className="news-severity-icon">{getSeverityIcon()}</span>
                <span className="news-date">{formatDate(alert.date)}</span>
                <span className="news-source">{alert.source}</span>
            </div>
            <h4 className="news-title">{alert.title}</h4>
            <p className="news-summary">{alert.summary}</p>
            {alert.url && (
                <a href={alert.url} target="_blank" rel="noopener noreferrer" className="news-link">
                    Read more →
                </a>
            )}
        </div>
    );
}

interface NewsSectionProps {
    title: string;
    region: string;
    alerts: NewsAlert[];
    isExpanded: boolean;
    onToggle: () => void;
}

function NewsSection({ title, region, alerts, isExpanded, onToggle }: NewsSectionProps) {
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const warningCount = alerts.filter(a => a.severity === 'warning').length;

    return (
        <div className={`news-section ${isExpanded ? 'expanded' : ''}`}>
            <button className="news-section-header" onClick={onToggle}>
                <div className="section-title-group">
                    <span className="section-icon">{region === 'NYC' ? '🗽' : region === 'NYS' ? '🗽' : '🇺🇸'}</span>
                    <h3 className="section-title">{title}</h3>
                </div>
                <div className="section-badges">
                    {criticalCount > 0 && (
                        <span className="badge badge-critical">{criticalCount} critical</span>
                    )}
                    {warningCount > 0 && (
                        <span className="badge badge-warning">{warningCount} warning</span>
                    )}
                    <span className="expand-icon">{isExpanded ? '−' : '+'}</span>
                </div>
            </button>

            {isExpanded && (
                <div className="news-section-content">
                    {alerts.map(alert => (
                        <NewsItem key={alert.id} alert={alert} />
                    ))}
                </div>
            )}
        </div>
    );
}

export function NewsAlertPanel({ newsData }: NewsAlertPanelProps) {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['nyc']));

    const toggleSection = (section: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(section)) {
                next.delete(section);
            } else {
                next.add(section);
            }
            return next;
        });
    };

    return (
        <div className="news-panel">
            <div className="news-panel-header">
                <h2 className="news-panel-title">
                    <span className="title-icon">📢</span>
                    Health News & Alerts
                </h2>
            </div>

            <div className="news-sections">
                <NewsSection
                    title="New York City"
                    region="NYC"
                    alerts={newsData.nyc}
                    isExpanded={expandedSections.has('nyc')}
                    onToggle={() => toggleSection('nyc')}
                />

                <NewsSection
                    title="New York State"
                    region="NYS"
                    alerts={newsData.nys}
                    isExpanded={expandedSections.has('nys')}
                    onToggle={() => toggleSection('nys')}
                />

                <NewsSection
                    title="United States"
                    region="USA"
                    alerts={newsData.usa}
                    isExpanded={expandedSections.has('usa')}
                    onToggle={() => toggleSection('usa')}
                />
            </div>
        </div>
    );
}
