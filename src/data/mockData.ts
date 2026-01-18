// Mock data for NYC/NYS Public Health Dashboard
// Based on real statistics from NYC DOH and NY State Health Department

import type {
    RegionalStats,

    VaccinationData,
    NewsData,
    DiseaseStats,
} from '../types';

function calculateTrend(current: number, previous: number): { trend: 'rising' | 'falling' | 'stable', percentChange: number } {
    const percentChange = previous === 0 ? 0 : ((current - previous) / previous) * 100;
    let trend: 'rising' | 'falling' | 'stable';

    if (percentChange > 5) trend = 'rising';
    else if (percentChange < -5) trend = 'falling';
    else trend = 'stable';

    return { trend, percentChange: Math.round(percentChange * 10) / 10 };
}

export function generateDiseaseStats(): RegionalStats {
    const now = new Date().toISOString();

    const nycStats: DiseaseStats[] = [
        {
            name: 'Hospital Admissions',
            currentCount: 1247,
            weekAgo: { count: 1156, ...calculateTrend(1247, 1156) },
            monthAgo: { count: 1020, ...calculateTrend(1247, 1020) },
            twoMonthsAgo: { count: 980, ...calculateTrend(1247, 980) },
            yearAgo: { count: 850, ...calculateTrend(1247, 850) },
            unit: 'weekly',
            lastUpdated: now,
        },
        {
            name: 'COVID-19 Cases',
            currentCount: 3842,
            weekAgo: { count: 4215, ...calculateTrend(3842, 4215) },
            monthAgo: { count: 5100, ...calculateTrend(3842, 5100) },
            twoMonthsAgo: { count: 5500, ...calculateTrend(3842, 5500) },
            yearAgo: { count: 12000, ...calculateTrend(3842, 12000) },
            unit: 'weekly',
            lastUpdated: now,
        },
        {
            name: 'Influenza Cases',
            currentCount: 2156,
            weekAgo: { count: 1823, ...calculateTrend(2156, 1823) },
            monthAgo: { count: 1200, ...calculateTrend(2156, 1200) },
            twoMonthsAgo: { count: 800, ...calculateTrend(2156, 800) },
            yearAgo: { count: 500, ...calculateTrend(2156, 500) },
            unit: 'weekly',
            lastUpdated: now,
        },
        {
            name: 'Chikungunya virus disease',
            currentCount: 3,
            weekAgo: { count: 3, ...calculateTrend(3, 3) },
            monthAgo: { count: 2, ...calculateTrend(3, 2) },
            twoMonthsAgo: { count: 1, ...calculateTrend(3, 1) },
            yearAgo: { count: 0, ...calculateTrend(3, 0) },
            unit: 'YTD (2025)',
            lastUpdated: now,
        },
        {
            name: 'Diphtheria',
            currentCount: 0,
            weekAgo: { count: 0, ...calculateTrend(0, 0) },
            monthAgo: { count: 0, ...calculateTrend(0, 0) },
            twoMonthsAgo: { count: 0, ...calculateTrend(0, 0) },
            yearAgo: { count: 0, ...calculateTrend(0, 0) },
            unit: 'YTD (2025)',
            lastUpdated: now,
        },
        {
            name: 'Mpox',
            currentCount: 48,
            weekAgo: { count: 46, ...calculateTrend(48, 46) },
            monthAgo: { count: 40, ...calculateTrend(48, 40) },
            twoMonthsAgo: { count: 35, ...calculateTrend(48, 35) },
            yearAgo: { count: 10, ...calculateTrend(48, 10) },
            unit: 'YTD (2025)',
            lastUpdated: now,
        },
        {
            name: 'Measles',
            currentCount: 20,
            weekAgo: { count: 19, ...calculateTrend(20, 19) },
            monthAgo: { count: 18, ...calculateTrend(20, 18) },
            twoMonthsAgo: { count: 15, ...calculateTrend(20, 15) },
            yearAgo: { count: 5, ...calculateTrend(20, 5) },
            unit: 'YTD (2025)',
            lastUpdated: now,
        },
        {
            name: 'Pertussis',
            currentCount: 145,
            weekAgo: { count: 140, ...calculateTrend(145, 140) },
            monthAgo: { count: 120, ...calculateTrend(145, 120) },
            twoMonthsAgo: { count: 100, ...calculateTrend(145, 100) },
            yearAgo: { count: 80, ...calculateTrend(145, 80) },
            unit: 'YTD (2025)',
            lastUpdated: now,
        },
        {
            name: 'Poliomyelitis',
            currentCount: 0,
            weekAgo: { count: 0, ...calculateTrend(0, 0) },
            monthAgo: { count: 0, ...calculateTrend(0, 0) },
            twoMonthsAgo: { count: 0, ...calculateTrend(0, 0) },
            yearAgo: { count: 0, ...calculateTrend(0, 0) },
            unit: 'YTD (2025)',
            lastUpdated: now,
        },
        {
            name: 'Rift Valley fever',
            currentCount: 0,
            weekAgo: { count: 0, ...calculateTrend(0, 0) },
            monthAgo: { count: 0, ...calculateTrend(0, 0) },
            twoMonthsAgo: { count: 0, ...calculateTrend(0, 0) },
            yearAgo: { count: 0, ...calculateTrend(0, 0) },
            unit: 'YTD (2025)',
            lastUpdated: now,
        },
    ];

    const nysStats: DiseaseStats[] = [
        {
            name: 'Hospital Admissions',
            currentCount: 4521,
            weekAgo: { count: 4200, ...calculateTrend(4521, 4200) },
            monthAgo: { count: 4000, ...calculateTrend(4521, 4000) },
            twoMonthsAgo: { count: 3800, ...calculateTrend(4521, 3800) },
            yearAgo: { count: 3500, ...calculateTrend(4521, 3500) },
            unit: 'weekly',
            lastUpdated: now,
        },
        {
            name: 'COVID-19 Cases',
            currentCount: 12847,
            weekAgo: { count: 14523, ...calculateTrend(12847, 14523) },
            monthAgo: { count: 16000, ...calculateTrend(12847, 16000) },
            twoMonthsAgo: { count: 17000, ...calculateTrend(12847, 17000) },
            yearAgo: { count: 25000, ...calculateTrend(12847, 25000) },
            unit: 'weekly',
            lastUpdated: now,
        },
        {
            name: 'Influenza Cases',
            currentCount: 8934,
            weekAgo: { count: 7652, ...calculateTrend(8934, 7652) },
            monthAgo: { count: 6000, ...calculateTrend(8934, 6000) },
            twoMonthsAgo: { count: 4000, ...calculateTrend(8934, 4000) },
            yearAgo: { count: 2000, ...calculateTrend(8934, 2000) },
            unit: 'weekly',
            lastUpdated: now,
        },
        {
            name: 'Chikungunya virus disease',
            currentCount: 8,
            weekAgo: { count: 8, ...calculateTrend(8, 8) },
            monthAgo: { count: 6, ...calculateTrend(8, 6) },
            twoMonthsAgo: { count: 4, ...calculateTrend(8, 4) },
            yearAgo: { count: 2, ...calculateTrend(8, 2) },
            unit: 'YTD (2025)',
            lastUpdated: now,
        },
        {
            name: 'Diphtheria',
            currentCount: 1,
            weekAgo: { count: 1, ...calculateTrend(1, 1) },
            monthAgo: { count: 1, ...calculateTrend(1, 1) },
            twoMonthsAgo: { count: 0, ...calculateTrend(1, 0) },
            yearAgo: { count: 0, ...calculateTrend(1, 0) },
            unit: 'YTD (2025)',
            lastUpdated: now,
        },
        {
            name: 'Mpox',
            currentCount: 156,
            weekAgo: { count: 150, ...calculateTrend(156, 150) },
            monthAgo: { count: 130, ...calculateTrend(156, 130) },
            twoMonthsAgo: { count: 100, ...calculateTrend(156, 100) },
            yearAgo: { count: 50, ...calculateTrend(156, 50) },
            unit: 'YTD (2025)',
            lastUpdated: now,
        },
        {
            name: 'Measles',
            currentCount: 47,
            weekAgo: { count: 45, ...calculateTrend(47, 45) },
            monthAgo: { count: 40, ...calculateTrend(47, 40) },
            twoMonthsAgo: { count: 35, ...calculateTrend(47, 35) },
            yearAgo: { count: 15, ...calculateTrend(47, 15) },
            unit: 'YTD (2025)',
            lastUpdated: now,
        },
        {
            name: 'Pertussis',
            currentCount: 412,
            weekAgo: { count: 400, ...calculateTrend(412, 400) },
            monthAgo: { count: 350, ...calculateTrend(412, 350) },
            twoMonthsAgo: { count: 300, ...calculateTrend(412, 300) },
            yearAgo: { count: 200, ...calculateTrend(412, 200) },
            unit: 'YTD (2025)',
            lastUpdated: now,
        },
        {
            name: 'Poliomyelitis',
            currentCount: 0,
            weekAgo: { count: 0, ...calculateTrend(0, 0) },
            monthAgo: { count: 0, ...calculateTrend(0, 0) },
            twoMonthsAgo: { count: 0, ...calculateTrend(0, 0) },
            yearAgo: { count: 0, ...calculateTrend(0, 0) },
            unit: 'YTD (2025)',
            lastUpdated: now,
        },
        {
            name: 'Rift Valley fever',
            currentCount: 0,
            weekAgo: { count: 0, ...calculateTrend(0, 0) },
            monthAgo: { count: 0, ...calculateTrend(0, 0) },
            twoMonthsAgo: { count: 0, ...calculateTrend(0, 0) },
            yearAgo: { count: 0, ...calculateTrend(0, 0) },
            unit: 'YTD (2025)',
            lastUpdated: now,
        },
    ];

    return { nyc: nycStats, nys: nysStats };
}



export function generateVaccinationData(): VaccinationData {
    return {
        nyc: [
            { name: 'COVID-19 (Updated Booster)', currentYear: 23.4, fiveYearsAgo: 0, tenYearsAgo: 0 },
            { name: 'Influenza (Annual)', currentYear: 48.2, fiveYearsAgo: 51.3, tenYearsAgo: 42.7 },
            { name: 'MMR (Children 2yo)', currentYear: 92.1, fiveYearsAgo: 95.8, tenYearsAgo: 96.2 },
            { name: 'Childhood 7-Vaccine Series', currentYear: 68.4, fiveYearsAgo: 71.2, tenYearsAgo: 69.8 },
            { name: 'DTaP (Children)', currentYear: 94.3, fiveYearsAgo: 96.1, tenYearsAgo: 95.7 },
            { name: 'HPV (Adolescents)', currentYear: 72.8, fiveYearsAgo: 64.2, tenYearsAgo: 41.3 },
        ],
        nys: [
            { name: 'COVID-19 (Updated Booster)', currentYear: 21.8, fiveYearsAgo: 0, tenYearsAgo: 0 },
            { name: 'Influenza (Annual)', currentYear: 52.1, fiveYearsAgo: 54.7, tenYearsAgo: 45.2 },
            { name: 'MMR (Children 2yo)', currentYear: 93.7, fiveYearsAgo: 96.4, tenYearsAgo: 97.1 },
            { name: 'Childhood 7-Vaccine Series', currentYear: 70.2, fiveYearsAgo: 73.5, tenYearsAgo: 71.4 },
            { name: 'DTaP (Children)', currentYear: 95.1, fiveYearsAgo: 96.8, tenYearsAgo: 96.2 },
            { name: 'HPV (Adolescents)', currentYear: 68.4, fiveYearsAgo: 59.7, tenYearsAgo: 38.9 },
        ],
        lastUpdated: new Date().toISOString(),
    };
}

export function generateNewsData(): NewsData {
    return {
        nyc: [
            {
                id: 'nyc-1',
                title: 'NYC Health Department Issues Flu Warning',
                summary: 'Influenza activity has increased significantly across all five boroughs. Health officials urge residents to get vaccinated.',
                date: '2025-12-30',
                severity: 'warning',
                source: 'NYC DOHMH',
                url: 'https://www.nyc.gov/health',
            },
            {
                id: 'nyc-2',
                title: 'Measles Cases Rise in Brooklyn Communities',
                summary: '20 confirmed measles cases in 2025, primarily in areas with lower vaccination rates. MMR vaccination clinics expanded.',
                date: '2025-12-28',
                severity: 'critical',
                source: 'NYC DOHMH',
            },
            {
                id: 'nyc-3',
                title: 'COVID-19 Wastewater Levels Show Increase',
                summary: 'Wastewater surveillance detects rising SARS-CoV-2 concentrations. Updated boosters available at all city vaccination sites.',
                date: '2025-12-27',
                severity: 'info',
                source: 'NYC DEP',
            },
            {
                id: 'nyc-4',
                title: 'Free Flu Shots Available at NYC Public Schools',
                summary: 'Health Department partners with DOE to offer free flu vaccinations to all students and staff through January.',
                date: '2025-12-26',
                severity: 'info',
                source: 'NYC DOHMH',
            },
        ],
        nys: [
            {
                id: 'nys-1',
                title: 'NY State Declares Flu Season Emergency',
                summary: 'Governor signs executive order expanding access to antivirals and increasing hospital surge capacity statewide.',
                date: '2025-12-29',
                severity: 'critical',
                source: 'NY State DOH',
            },
            {
                id: 'nys-2',
                title: 'Statewide Wastewater Surveillance Expanded',
                summary: 'Additional monitoring sites added across upstate regions to track respiratory virus trends.',
                date: '2025-12-27',
                severity: 'info',
                source: 'NY State DOH',
            },
            {
                id: 'nys-3',
                title: 'Childhood Vaccination Rates Decline for Third Year',
                summary: 'State health officials express concern over declining MMR and DTaP vaccination rates among 2-year-olds.',
                date: '2025-12-25',
                severity: 'warning',
                source: 'NY State DOH',
            },
        ],
        usa: [
            {
                id: 'usa-1',
                title: 'CDC Reports Elevated Respiratory Virus Activity Nationwide',
                summary: 'Multiple respiratory viruses including COVID-19, flu, and RSV are circulating at high levels across the country.',
                date: '2025-12-30',
                severity: 'warning',
                source: 'CDC',
                url: 'https://www.cdc.gov/respiratory-viruses',
            },
            {
                id: 'usa-2',
                title: 'FDA Approves Updated COVID-19 Vaccine for Spring 2026',
                summary: 'New formulation targets latest circulating variants. Rollout expected in March 2026.',
                date: '2025-12-28',
                severity: 'info',
                source: 'FDA',
            },
            {
                id: 'usa-3',
                title: 'National Measles Cases Exceed 500 for 2025',
                summary: 'Highest annual case count since 2019. CDC emphasizes importance of MMR vaccination.',
                date: '2025-12-26',
                severity: 'critical',
                source: 'CDC',
            },
            {
                id: 'usa-4',
                title: 'Hospital Capacity Concerns in Multiple States',
                summary: 'Rising flu and COVID hospitalizations strain healthcare systems. Several states activate emergency protocols.',
                date: '2025-12-24',
                severity: 'warning',
                source: 'HHS',
            },
        ],
        lastUpdated: new Date().toISOString(),
    };
}
