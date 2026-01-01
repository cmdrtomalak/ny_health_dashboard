import type { TrendDirection } from '../types';
import './TrendIndicator.css';

interface TrendIndicatorProps {
    trend: TrendDirection;
    percentChange: number;
    size?: 'small' | 'medium' | 'large';
}

export function TrendIndicator({ trend, percentChange, size = 'medium' }: TrendIndicatorProps) {
    const getArrow = () => {
        switch (trend) {
            case 'rising':
                return '↑';
            case 'falling':
                return '↓';
            case 'stable':
                return '→';
        }
    };

    const getLabel = () => {
        const absChange = Math.abs(percentChange);
        if (trend === 'stable') return 'Stable';
        return `${absChange}%`;
    };

    return (
        <div className={`trend-indicator trend-${trend} trend-${size}`}>
            <span className="trend-arrow">{getArrow()}</span>
            <span className="trend-label">{getLabel()}</span>
            <span className="trend-text">
                {trend === 'rising' && 'from last week'}
                {trend === 'falling' && 'from last week'}
                {trend === 'stable' && 'vs last week'}
            </span>
        </div>
    );
}
