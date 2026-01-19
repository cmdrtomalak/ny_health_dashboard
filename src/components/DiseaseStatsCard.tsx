import type { DiseaseStats } from '../types';
import { TrendIndicator } from './TrendIndicator';
import './DiseaseStatsCard.css';

interface DiseaseStatsCardProps {
    stat: DiseaseStats;
    region: 'NYC' | 'NYS';
}

export function DiseaseStatsCard({ stat, region }: DiseaseStatsCardProps) {
    const formatNumber = (num: number) => {
        return num.toLocaleString();
    };

    const getIcon = () => {
        const lowerName = stat.name.toLowerCase();
        if (lowerName.includes('hospital')) return '🏥';
        if (lowerName.includes('covid')) return '🦠';
        if (lowerName.includes('flu') || lowerName.includes('influenza')) return '🤒';
        if (lowerName.includes('measles')) return '🔴';
        if (lowerName.includes('chikungunya')) return '🦟';
        if (lowerName.includes('diphtheria')) return '🩺';
        if (lowerName.includes('marburg')) return '☣️';
        if (lowerName.includes('mpox') || lowerName.includes('monkeypox')) return '🔬';
        if (lowerName.includes('pertussis') || lowerName.includes('whooping')) return '🗣️';
        if (lowerName.includes('polio')) return '♿';
        if (lowerName.includes('rift valley')) return '🐄';
        return '📊';
    };

    // Use Weekly comparison by default
    const trendData = stat.weekAgo;

    return (
        <div className={`disease-card disease-card-${trendData.trend}`}>
            <div className="disease-card-header">
                <span className="disease-icon">{getIcon()}</span>
                <span className="disease-region-badge">{region}</span>
            </div>

            <h3 className="disease-name">{stat.name}</h3>

            <div className="disease-count">
                <span className="count-value">{formatNumber(stat.currentCount)}</span>
                <span className="count-unit">{stat.unit}</span>
            </div>

            <div className="disease-comparison">
                <span className="previous-count">
                    Prev: {formatNumber(trendData.count)}
                </span>
            </div>

            <div className="disease-trend">
                <TrendIndicator
                    trend={trendData.trend}
                    percentChange={trendData.percentChange}
                    size="medium"
                />
            </div>

            {stat.dataSource && (
                <div className="disease-source">
                    <a href={stat.sourceUrl || '#'} target="_blank" rel="noopener noreferrer">
                        Source: {stat.dataSource}
                    </a>
                </div>
            )}

            <div className="metadata-tooltip">
                <div className="tooltip-item">
                    <span className="tooltip-label">Source:</span>
                    <span className="tooltip-value">{stat.dataSource || 'Official Health Data'}</span>
                </div>
                <div className="tooltip-item">
                    <span className="tooltip-label">Reporting Period:</span>
                    <span className="tooltip-value">
                        {new Date(stat.lastUpdated).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        })}
                    </span>
                </div>
            </div>
        </div>
    );
}
