import React, { useState } from 'react';
import './RespiratoryEmbed.css';

type DiseaseType = 'covid-19' | 'flu' | 'rsv';

interface TabConfig {
    id: DiseaseType;
    label: string;
}

const TABS: TabConfig[] = [
    { id: 'covid-19', label: 'COVID-19' },
    { id: 'flu', label: 'Flu' },
    { id: 'rsv', label: 'RSV' }
];

const BASE_URL = 'https://www.nyc.gov/assets/doh/respiratory-illness-data/index.html#/data/';

export const RespiratoryEmbed: React.FC = () => {
    const [activeDisease, setActiveDisease] = useState<DiseaseType>('covid-19');
    const [isLoading, setIsLoading] = useState(true);

    const handleTabClick = (disease: DiseaseType) => {
        if (disease !== activeDisease) {
            setIsLoading(true);
            setActiveDisease(disease);
        }
    };

    const handleIframeLoad = () => {
        setIsLoading(false);
    };

    return (
        <section className="respiratory-embed">
            <h2>📊 NYC Respiratory Illness Data</h2>

            <div className="respiratory-tabs">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        className={`respiratory-tab ${activeDisease === tab.id ? 'active' : ''}`}
                        data-disease={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="respiratory-iframe-container">
                {isLoading && (
                    <div className="respiratory-loading">Loading charts...</div>
                )}
                <div className="respiratory-iframe-wrapper">
                    <iframe
                        key={activeDisease}
                        className="respiratory-iframe"
                        src={`${BASE_URL}${activeDisease}`}
                        title={`NYC ${activeDisease.toUpperCase()} Respiratory Illness Data`}
                        onLoad={handleIframeLoad}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                </div>
            </div>

            <p className="respiratory-note">
                Data provided by{' '}
                <a
                    href={`${BASE_URL}${activeDisease}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    NYC Department of Health and Mental Hygiene
                </a>
                . Use sub-tabs within the embedded page to explore Emergency Department Data, Lab-reported Cases, and Deaths.
            </p>
        </section>
    );
};

export default RespiratoryEmbed;
