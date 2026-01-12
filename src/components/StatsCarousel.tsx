import React, { useRef } from 'react';
import { DiseaseStatsCard } from './DiseaseStatsCard';
import type { DiseaseStats } from '../types';
import './StatsCarousel.css';

interface StatsCarouselProps {
    title: string;
    icon: string;
    stats: DiseaseStats[];
    region: 'NYC' | 'NYS';
}

export const StatsCarousel: React.FC<StatsCarouselProps> = ({ title, icon, stats, region }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Sort stats from largest count to lowest count
    const sortedStats = [...stats].sort((a, b) => b.currentCount - a.currentCount);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 320; // Card width + gap
            const currentScroll = scrollContainerRef.current.scrollLeft;
            const newScroll = direction === 'left'
                ? currentScroll - scrollAmount
                : currentScroll + scrollAmount;

            scrollContainerRef.current.scrollTo({
                left: newScroll,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="stats-carousel-container">
            <div className="carousel-header">
                <h3 className="region-title">
                    <span className="region-flag">{icon}</span>
                    {title}
                </h3>
            </div>

            <div className="carousel-wrapper">
                <button
                    className="carousel-btn left-floating"
                    onClick={() => scroll('left')}
                    aria-label="Scroll left"
                >
                    ←
                </button>

                <div className="stats-track" ref={scrollContainerRef}>
                    {sortedStats.map((stat, index) => (
                        <div key={`${stat.name}-${index}`} className="carousel-item">
                            <DiseaseStatsCard stat={stat} region={region} />
                        </div>
                    ))}
                </div>

                <button
                    className="carousel-btn right-floating"
                    onClick={() => scroll('right')}
                    aria-label="Scroll right"
                >
                    →
                </button>
            </div>
        </div>
    );
};
