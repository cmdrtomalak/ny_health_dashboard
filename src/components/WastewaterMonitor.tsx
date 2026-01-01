import React, { useMemo } from 'react';
import type { WastewaterData, WastewaterSample } from '../types';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import './WastewaterMonitor.css';

interface WastewaterMonitorProps {
    data: WastewaterData;
}

export const WastewaterMonitor: React.FC<WastewaterMonitorProps> = ({ data }) => {
    // Group samples by pathogen
    // If no 'pathogen' field, assume single series 'Viral Load'
    const chartDataGroups = useMemo(() => {
        const groups: Record<string, WastewaterSample[]> = {};

        // Check if we have explicit pathogen list or just samples
        if (data.samples.length === 0) return {};

        data.samples.forEach(sample => {
            const key = sample.pathogen || 'Viral Load';
            if (!groups[key]) groups[key] = [];
            groups[key].push(sample);
        });

        return groups;
    }, [data.samples]);

    const pathogenKeys = Object.keys(chartDataGroups);

    return (
        <div className="wastewater-monitor-container">
            <div className="monitor-header">
                <h2 className="section-title">
                    <span className="section-icon">💧</span>
                    Wastewater Surveillance
                </h2>
                <div className={`alert-badge alert-${data.alertLevel}`}>
                    Alert Level: {data.alertLevel.toUpperCase()}
                </div>
            </div>

            <p className="monitor-subtitle">
                Viral concentrations tracked at NYC/NYS treatment plants.
            </p>

            {/* Render a chart for each pathogen */}
            <div className="charts-grid">
                {pathogenKeys.length === 0 ? (
                    <p className="no-data">No waste water data available.</p>
                ) : (
                    pathogenKeys.map(pathogen => (
                        <div key={pathogen} className="chart-wrapper">
                            <h4 className="chart-title">{pathogen}</h4>
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height={250}>
                                    <LineChart data={chartDataGroups[pathogen]}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            tick={{ fontSize: 12, fill: '#666' }}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 12, fill: '#666' }}
                                            width={40}
                                        />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                        />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey="concentration"
                                            name="Concentration (copies/L)"
                                            stroke="#2563eb"
                                            strokeWidth={2}
                                            dot={false}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
