import type { VaccinationData, VaccinationType } from '../types';
import Papa from 'papaparse';
import { getFromCache, saveToCache, shouldRefreshCache } from './cache';

const NYS_VAX_API = 'https://health.data.ny.gov/resource/xrhr-cy84.json';
const CHILDHOOD_DATA_URL = 'https://raw.githubusercontent.com/nychealth/immunization-data/main/demo/Main_Routine_Vaccine_Demo.csv';
const CACHE_KEY_VAX = 'vaccination_data';

interface ChildhoodVaccineRaw {
    VACCINE_GROUP: string;
    YEAR_COVERAGE: string;
    QUARTER?: string;
    COUNT_PEOPLE_VAC: string | number;
    POP_DENOMINATOR: string | number;
    PERC_VAC: string | number; // Pre-validated percentage from source
}

interface NYSVaxRecord {
    geography_description: string;
    geography_level: string;
    week_ending: string;
    respiratory_season: string;
    covid_19_dose_count: string;
    influenza_dose_count: string;
}

export async function fetchVaccinationData(forceRefresh = false): Promise<VaccinationData> {
    // Check cache first
    if (!forceRefresh) {
        const cached = await getFromCache<VaccinationData>(CACHE_KEY_VAX);
        if (cached && !shouldRefreshCache(cached.metadata)) {
            console.log('[VaccinationService] Returning cached vaccination data');
            return cached.data;
        }
    }

    console.log('[VaccinationService] Fetching fresh vaccination data...');

    const [nysData, childhoodData] = await Promise.all([
        fetchNysFluCovid(),
        fetchChildhoodVaccines()
    ]);

    // Merge logic: 
    // - Use childhood data for NYC (since the CSV is NYC specific)
    // - Use NYS data for COVID/Flu (valid for both or just NYS, we'll replicate for now as placeholder for NYC if missing)

    // Create combined lists
    const nycVaccines: VaccinationType[] = [
        ...nysData.nyc, // Keep flu/covid
        ...childhoodData // Add childhood
    ];

    const nysVaccines: VaccinationType[] = [
        ...nysData.nys
        // Childhood CSV is NYC only usually. We won't add it to NYS unless we know it applies.
        // For the purpose of the dashboard, showing NYC data in NYS tab might be misleading, 
        // so we'll leave NYS with just Flu/Covid or placeholder N/As.
    ];

    const result: VaccinationData = {
        nyc: nycVaccines,
        nys: nysVaccines,
        lastUpdated: new Date().toISOString()
    };

    // Save to cache
    await saveToCache(CACHE_KEY_VAX, result);
    console.log('[VaccinationService] Vaccination data cached');

    return result;
}

async function fetchNysFluCovid() {
    try {
        // Use REST OF STATE to get statewide data (NYC reports separately and shows 0)
        // Fetch all weekly records for the current season and aggregate
        const response = await fetch(`${NYS_VAX_API}?geography_level=REST%20OF%20STATE&$limit=1000`);
        let covidTotal = 0;
        let fluTotal = 0;
        let latestDate = '';
        let season = '2024-2025';

        if (response.ok) {
            const data: NYSVaxRecord[] = await response.json();
            if (data.length > 0) {
                // Aggregate all weekly dose counts for the season
                for (const record of data) {
                    covidTotal += parseInt(record.covid_19_dose_count) || 0;
                    fluTotal += parseInt(record.influenza_dose_count) || 0;
                }

                // Get latest date and season
                const sortedByDate = [...data].sort((a, b) =>
                    new Date(b.week_ending).getTime() - new Date(a.week_ending).getTime()
                );
                if (sortedByDate.length > 0) {
                    latestDate = sortedByDate[0].week_ending.split('T')[0]; // Get just the date part
                    season = sortedByDate[0].respiratory_season || season;
                }
            }
        }

        // NYS population estimate (excluding NYC which reports separately)
        const nysPopExcludingNYC = 11_600_000; // ~11.6M for Rest of State

        const stats: VaccinationType[] = [
            {
                name: 'COVID-19 (Seasonal Doses)',
                currentYear: 0, // Mark as 0 for "current year" column since it's seasonal totals
                fiveYearsAgo: -1,
                tenYearsAgo: -1,
                collectionMethod: 'NYS Immunization Information System (NYSIIS) - Weekly Aggregate Reports',
                sourceUrl: NYS_VAX_API,
                isReportingStopped: false,
                lastAvailableRate: covidTotal,
                lastAvailableDate: `${season} Season (as of ${latestDate})`,
                calculationDetails: {
                    numerator: covidTotal,
                    denominator: nysPopExcludingNYC,
                    logic: "Sum of weekly 'covid_19_dose_count' for REST OF STATE geography. This represents total doses administered, not a coverage rate.",
                    sourceLocation: `NYS Open Data API: geography_level='REST OF STATE', respiratory_season='${season}'`
                }
            },
            {
                name: 'Influenza (Seasonal Doses)',
                currentYear: 0,
                fiveYearsAgo: -1,
                tenYearsAgo: -1,
                collectionMethod: 'NYS Immunization Information System (NYSIIS) - Weekly Aggregate Reports',
                sourceUrl: NYS_VAX_API,
                isReportingStopped: false,
                lastAvailableRate: fluTotal,
                lastAvailableDate: `${season} Season (as of ${latestDate})`,
                calculationDetails: {
                    numerator: fluTotal,
                    denominator: nysPopExcludingNYC,
                    logic: "Sum of weekly 'influenza_dose_count' for REST OF STATE geography. This represents total doses administered, not a coverage rate.",
                    sourceLocation: `NYS Open Data API: geography_level='REST OF STATE', respiratory_season='${season}'`
                }
            }
        ];

        return { nyc: stats, nys: stats };
    } catch (e) {
        console.error('NYS Vax fetch failed', e);
        return { nyc: [], nys: [] };
    }
}

async function fetchChildhoodVaccines(): Promise<VaccinationType[]> {
    try {
        const response = await fetch(CHILDHOOD_DATA_URL);
        if (!response.ok) throw new Error('Failed to fetch childhood csv');

        const text = await response.text();

        return new Promise((resolve) => {
            Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const rows = results.data as ChildhoodVaccineRaw[];
                    const processed = processChildhoodRows(rows);
                    resolve(processed);
                },
                error: (err: unknown) => {
                    console.error('CSV Parse error', err);
                    resolve([]);
                }
            });
        });
    } catch (e) {
        console.error('Childhood fetch failed', e);
        return [];
    }
}

// Mapping of vaccine codes to physician-friendly names
const VACCINE_NAME_MAP: Record<string, string> = {
    'DTaP': 'DTaP (Diphtheria, Tetanus, Pertussis)',
    'Polio': 'IPV (Inactivated Polio Vaccine)',
    'MMR': 'MMR (Measles, Mumps, Rubella)',
    'Varicella': 'Varicella (Chickenpox)',
    'HepB': 'Hepatitis B',
    'Hib': 'Hib (Haemophilus influenzae type b)',
    'PCV': 'PCV (Pneumococcal Conjugate)',
    '4313314': 'Combined 7-Vaccine Series (4:3:1:3:3:1:4)',
    '4:3:1:3:3:1:4': 'Combined 7-Vaccine Series (4:3:1:3:3:1:4)',
};

function processChildhoodRows(rows: ChildhoodVaccineRaw[]): VaccinationType[] {
    // Use weighted average of pre-validated PERC_VAC from source data
    // The source PERC_VAC accounts for methodological adjustments
    // Also track raw counts for display in the modal
    const vaccineGroups: Record<string, {
        weightedPercSum: number, // Sum of (PERC_VAC * POP_DENOMINATOR)
        totalPop: number,        // Sum of POP_DENOMINATOR (for weighting)
        totalVaccinated: number  // Sum of COUNT_PEOPLE_VAC (for modal display)
    }> = {};
    const latestYear = '2025';

    rows.forEach(row => {
        if (row.YEAR_COVERAGE !== latestYear) return;
        if (row.QUARTER && row.QUARTER !== 'Q2') return;

        const vacName = row.VACCINE_GROUP;
        const pop = parseFloat((row.POP_DENOMINATOR || '0').toString().replace(/,/g, ''));
        const perc = parseFloat((row.PERC_VAC || '0').toString().replace(/,/g, ''));
        const vaccinated = parseFloat((row.COUNT_PEOPLE_VAC || '0').toString().replace(/,/g, ''));

        if (!vaccineGroups[vacName]) {
            vaccineGroups[vacName] = { weightedPercSum: 0, totalPop: 0, totalVaccinated: 0 };
        }

        // Only include rows with valid population (for weighting)
        if (!isNaN(pop) && pop > 0 && !isNaN(perc)) {
            vaccineGroups[vacName].weightedPercSum += perc * pop;
            vaccineGroups[vacName].totalPop += pop;
        }
        // Track raw vaccinated counts (even if pop is 0 for some rows)
        if (!isNaN(vaccinated)) {
            vaccineGroups[vacName].totalVaccinated += vaccinated;
        }
    });

    return Object.keys(vaccineGroups).map(v => {
        const { weightedPercSum, totalPop, totalVaccinated } = vaccineGroups[v];
        // Weighted average of validated percentages
        const rate = totalPop > 0 ? weightedPercSum / totalPop : 0;

        // Map to physician-friendly name or use original
        const displayName = VACCINE_NAME_MAP[v] || v;

        return {
            name: displayName,
            currentYear: parseFloat(rate.toFixed(1)),
            fiveYearsAgo: -1,
            tenYearsAgo: -1,
            lastAvailableRate: parseFloat(rate.toFixed(1)),
            lastAvailableDate: `${latestYear} Q2`,
            collectionMethod: 'NYC Citywide Immunization Registry (CIR)',
            sourceUrl: CHILDHOOD_DATA_URL,
            calculationDetails: {
                numerator: totalVaccinated,
                denominator: totalPop,
                logic: `Weighted average of validated rates from source data across demographic groups`,
                sourceLocation: `NYC Health GitHub CSV. Vaccine: ${v}, Period: ${latestYear} Q2`
            }
        };
    });
}
