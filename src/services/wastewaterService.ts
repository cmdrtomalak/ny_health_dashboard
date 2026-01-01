import type { WastewaterData, TrendDirection } from '../types';

const NYC_WASTEWATER_API = 'https://health.data.ny.gov/resource/hdxs-icuh.json';

// Response type from NYS Open Data (generic wastewater)
interface NYCWastewaterRecord {
    samplecollectdate: string;
    wwtpname: string; // Plant name
    pcrtargetavgconc: string; // Concentration
    pcrtarget: string; // Pathogen
    county: string;
}

export async function fetchWastewaterData(): Promise<WastewaterData> {
    try {
        // Fetch last available data (sorted by date)
        const response = await fetch(
            `${NYC_WASTEWATER_API}?$order=samplecollectdate DESC&$limit=1000`
        );

        if (!response.ok) throw new Error('Failed to fetch wastewater data');

        const rawData: NYCWastewaterRecord[] = await response.json();

        // Process data
        // We will default to SARS-CoV-2 if pcrtarget is that, or map others.

        const samples = rawData.map(r => ({
            date: (r.samplecollectdate || '').split('T')[0],
            location: r.wwtpname,
            concentration: parseFloat(r.pcrtargetavgconc) || 0,
            trend: 'stable' as TrendDirection,
            pathogen: r.pcrtarget || 'SARS-CoV-2'
        })).filter(s => !isNaN(s.concentration));

        // Calculate simple averages
        const avg = samples.reduce((acc, curr) => acc + curr.concentration, 0) / (samples.length || 1);

        return {
            samples: samples.reverse(), // Ascending date
            averageConcentration: Math.round(avg),
            trend: 'stable',
            alertLevel: avg > 1000 ? 'high' : 'low',
            lastUpdated: new Date().toISOString(),
            pathogens: ['SARS-CoV-2'] // List checked pathogens
        };
    } catch (e) {
        console.error('Wastewater fetch failed', e);
        return {
            samples: [],
            averageConcentration: 0,
            trend: 'stable',
            alertLevel: 'low',
            lastUpdated: new Date().toISOString(),
            pathogens: []
        };
    }
}
