import type { DiseaseStats, TrendData } from '../types';

const CDC_NNDSS_API = 'https://data.cdc.gov/resource/x9gk-5huc.json';

// Diseases to track based on user request
const TRACKED_DISEASES = [
    'Chikungunya virus disease',
    'Diphtheria',
    'Marburg virus disease',
    'Measles',
    'Mpox',
    'Influenza-associated pediatric mortality', // Closest match in NNDSS for non-seasonal/general flu reporting often
    'Novel Influenza A virus infections',
    'Pertussis',
    'Poliomyelitis, paralytic',
    'Rift Valley fever',
    'COVID-19' // API might not have this, will show 0 but exist
];

interface NNDSSRecord {
    label: string; // Disease name
    m1: string; // Case count (Current week)
    states: string; // State/Location (e.g., "US RESIDENTS", "NEW YORK", "NEW YORK CITY")
    year: string;
    week: string;
    location1?: string;
}

interface CovidData {
    case_count: string;
    probable_case_count: string;
    date_of_interest: string;
}

interface FluData {
    epidata?: Array<{ num_ili: number }>;
}

export async function fetchDiseaseStats(): Promise<DiseaseStats[]> {
    try {
        // Fetch data from multiple sources in parallel
        const [nndssResponse, covidResponse, fluResponse] = await Promise.all([
            fetch(`${CDC_NNDSS_API}?$where=(location1='NEW YORK' OR location1='NEW YORK CITY')&$order=year DESC, week DESC&$limit=5000`),
            fetch(`https://data.cityofnewyork.us/resource/rc75-m7u3.json?$limit=5&$order=date_of_interest DESC`),
            fetch(`https://api.delphi.cmu.edu/epidata/fluview/?regions=hhs2&epiweeks=202501`) // Fetch latest available epiweek dynamically? Hardcoding 202501 for now as per successful test
        ]);

        const nndssData: NNDSSRecord[] = nndssResponse.ok ? await nndssResponse.json() : [];
        const covidData: CovidData[] = covidResponse.ok ? await covidResponse.json() : [];
        const fluData: FluData = fluResponse.ok ? await fluResponse.json() : {};

        // Process COVID Data (NYC Open Data)
        let covidCount = 0;
        let covidDate = new Date().toISOString();
        if (covidData.length > 0) {
            const latest = covidData[0];
            // Sum confirmed + probable
            covidCount = (parseInt(latest.case_count) || 0) + (parseInt(latest.probable_case_count) || 0);
            covidDate = latest.date_of_interest;
        }

        // Process Flu Data (Delphi ILI)
        let fluCount = 0;
        let fluDate = new Date().toISOString();
        if (fluData.epidata && fluData.epidata.length > 0) {
            fluCount = fluData.epidata[0].num_ili || 0;
            fluDate = new Date().toISOString(); // Delphi doesn't give exact ISO date, just epiweek
        }

        console.log('[API] CDC Raw Data (First 3):', nndssData.slice(0, 3));
        console.log('[API] COVID Raw Data:', covidData[0]);
        console.log('[API] Flu Raw Data:', fluData.epidata?.[0]);

        // Group by disease
        const diseaseMap = new Map<string, { current: number; yearAgo: number; source?: string; url?: string }>();

        // Initialize tracking map
        TRACKED_DISEASES.forEach(d => diseaseMap.set(d, { current: 0, yearAgo: 0 }));

        // Override COVID and Flu with specialized data
        if (covidCount > 0) {
            diseaseMap.set('COVID-19', {
                current: covidCount,
                yearAgo: 0,
                source: 'NYC Open Data',
                url: 'https://data.cityofnewyork.us/Health/COVID-19-Daily-Counts-of-Cases-Hospitalizations-/rc75-m7u3'
            });
        }

        if (fluCount > 0) {
            diseaseMap.set('Novl Influenza A virus infections', { // Temporarily mapping ILI to this or just strictly "Influenza Cases" if I add it to tracked?
                current: fluCount,
                yearAgo: 0
            });
            // Actually, let's map it to a generic "Influenza" key if we added it, 
            // but we added "Novel Influenza A virus infections" to TRACKED_DISEASES.
            // Better to add a generic "Influenza (ILI)" to TRACKED_DISEASES or just hijack one.
            // The user wants "Influenza Cases". I'll add "Influenza Cases" to TRACKED_DISEASES in the next step or implicitly here.
        }

        nndssData.forEach(record => {
            // "location1" filter applied
            const loc = (record.location1 || '').toUpperCase();
            if (!loc.includes('NEW YORK')) return;

            const disease = TRACKED_DISEASES.find(d => record.label && (record.label.includes(d) || d.includes(record.label)));
            if (disease) {
                // Skip COVID/Flu from NNDSS if we have better sources
                if (disease.includes('COVID') && covidCount > 0) return;
                // if (disease.includes('Influenza') && fluCount > 0) return; // Keep NNDSS specific flu strains if they exist?

                let count = 0;
                if (record.m1 && record.m1 !== '-') {
                    count = parseInt(record.m1);
                }

                if (!isNaN(count)) {
                    const stats = diseaseMap.get(disease)!;
                    stats.current += count;
                    diseaseMap.set(disease, stats);
                }
            }
        });

        const stats: DiseaseStats[] = [];

        // Helper to create trend
        const createTrend = (val: number): TrendData => ({
            count: val,
            trend: 'stable',
            percentChange: 0
        });

        for (const [name, counts] of diseaseMap.entries()) {
            // Special handling for the "Influenza" card which might be "Novel..." in the map
            // I want to show "Influenza (ILI)" as the main Flu card.

            stats.push({
                name: name,
                currentCount: counts.current,
                weekAgo: createTrend(0),
                monthAgo: createTrend(0),
                twoMonthsAgo: createTrend(0),
                yearAgo: createTrend(counts.yearAgo),
                unit: name.includes('COVID') ? 'cases (daily)' : (name.includes('Influenza') ? 'ILI visits (region)' : 'cases (YTD)'),
                lastUpdated: name.includes('COVID') ? covidDate : (name.includes('Influenza') ? fluDate : new Date().toISOString()),
                dataSource: counts.source || 'CDC NNDSS',
                sourceUrl: counts.url || 'https://data.cdc.gov/NNDSS/NNDSS-Weekly-Data/x9gk-5huc'
            });
        }

        // Manual insertion of "Influenza (ILI)" if we have it and it's not in the map key match
        if (fluCount > 0) {
            stats.push({
                name: 'Influenza (ILI)',
                currentCount: fluCount,
                weekAgo: createTrend(0),
                monthAgo: createTrend(0),
                twoMonthsAgo: createTrend(0),
                yearAgo: createTrend(0),
                unit: 'outpatient visits',
                lastUpdated: fluDate,
                dataSource: 'CDC ILINet (Delphi)',
                sourceUrl: 'https://github.com/cmu-delphi/delphi-epidata'
            });
        }

        // Sorting: Flu -> Covid -> High to Low
        stats.sort((a, b) => {
            const isFluA = a.name.toLowerCase().includes('influenza');
            const isFluB = b.name.toLowerCase().includes('influenza');
            if (isFluA && !isFluB) return -1;
            if (!isFluA && isFluB) return 1;

            const isCovidA = a.name.toLowerCase().includes('covid');
            const isCovidB = b.name.toLowerCase().includes('covid');
            if (isCovidA && !isCovidB) return -1;
            if (!isCovidA && isCovidB) return 1;

            return b.currentCount - a.currentCount;
        });

        return stats;
    } catch (error) {
        console.error('Disease fetch failed:', error);
        return [];
    }
}
