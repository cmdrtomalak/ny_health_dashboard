import Papa from 'papaparse';

// URL for the raw CSV data
const LIVE_DATA_URL = 'https://raw.githubusercontent.com/nychealth/immunization-data/main/demo/Main_Routine_Vaccine_Demo.csv';

// Mock data for development and testing
const MOCK_DATA = [
    { VACCINE_GROUP: 'MMR', YEAR_COVERAGE: '2025', PERC_VAC: 95, POP_DENOMINATOR: 100000, COUNT_PEOPLE_VAC: 95000 },
    { VACCINE_GROUP: 'DTaP', YEAR_COVERAGE: '2025', PERC_VAC: 92, POP_DENOMINATOR: 100000, COUNT_PEOPLE_VAC: 92000 },
    { VACCINE_GROUP: 'Polio', YEAR_COVERAGE: '2025', PERC_VAC: 94, POP_DENOMINATOR: 100000, COUNT_PEOPLE_VAC: 94000 },
    { VACCINE_GROUP: 'Varicella', YEAR_COVERAGE: '2025', PERC_VAC: 93, POP_DENOMINATOR: 100000, COUNT_PEOPLE_VAC: 93000 },
    { VACCINE_GROUP: 'Doses', YEAR_COVERAGE: '2025', PERC_VAC: 80, POP_DENOMINATOR: 100000, COUNT_PEOPLE_VAC: 80000 }, // Representing "4:3:1:3:3:1:4" series
];

/**
 * Service to fetch and process NYC childhood vaccination data.
 */
class VaccineDataService {
    /**
     * Fetches vaccination coverage data.
     * @param {boolean} useMock - If true, returns mock data instead of fetching from GitHub.
     * @returns {Promise<Array<{vaccine: string, rate: number, status: string}>>}
     */
    async fetchChildhoodCoverage(useMock = false, forceRefresh = false) {
        if (useMock) {
            console.log('Using mock vaccination data');
            return this._processData(MOCK_DATA);
        }


        const CACHE_KEY = 'vaccine_data_cache';
        const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

        if (!forceRefresh && typeof localStorage !== 'undefined') {
            try {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    const { timestamp, data } = JSON.parse(cached);
                    const age = Date.now() - timestamp;
                    if (age < CACHE_DURATION) {
                        console.log(`Using cached data (${(age / 1000 / 60).toFixed(1)} mins old)`);
                        return data;
                    } else {
                        console.log('Cache expired, refreshing...');
                    }
                }
            } catch (e) {
                console.warn('Failed to read from cache', e);
            }
        }

        try {
            console.log(`Fetching live data from: ${LIVE_DATA_URL}`);
            const response = await fetch(LIVE_DATA_URL);

            if (!response.ok) {
                throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
            }
            const csvText = await response.text();

            return new Promise((resolve, reject) => {
                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        if (results.errors.length > 0) {
                            console.warn("CSV parsing errors:", results.errors);
                        }
                        if (!results.data || results.data.length === 0) {
                            reject(new Error("No data found in CSV"));
                            return;
                        }

                        try {
                            const processed = this._processData(results.data);

                            // Cache the processed data
                            try {
                                if (typeof localStorage !== 'undefined') {
                                    localStorage.setItem(CACHE_KEY, JSON.stringify({
                                        timestamp: Date.now(),
                                        data: processed
                                    }));
                                    console.log('Data cached successfully');
                                }
                            } catch (cacheErr) {
                                console.warn('Failed to save to cache (quota exceeded?)', cacheErr);
                            }

                            resolve(processed);
                        } catch (err) {
                            reject(err);
                        }
                    },
                    error: (error) => {
                        reject(new Error(`CSV Parse Error: ${error.message}`));
                    }
                });
            });

        } catch (error) {
            console.error('Error fetching vaccination data:', error);
            throw error;
        }
    }

    /**
     * Processes the raw CSV data to extract citywide coverage for the latest year.
     * @param {Array} data - Raw data array from CSV or mock source.
     * @returns {Array} - Processed array of vaccine objects.
     */
    _processData(data) {
        // 1. Filter for latest year (2025) and Q2 (or latest quarter available)
        // For simplicity, we just look for 2025 coverage year. 
        // The CSV has rows broken down by RACE_ETHNICITY. 
        // We need to aggregate them to get a Citywide total if a "Total" row doesn't exist.
        // Based on inspection, there is no "Total" or "Citywide" row in the race breakdown chunks we saw.
        // So we sum up POP_DENOMINATOR and COUNT_PEOPLE_VAC for each VACCINE_GROUP.

        const latestYear = '2025';
        // Mapping of vaccine codes to friendly names if needed

        // Group by vaccine type
        const vaccineGroups = {};

        data.forEach(row => {
            if (row.YEAR_COVERAGE !== latestYear) return;
            if (row.QUARTER && row.QUARTER !== 'Q2') return; // Targeting Q2 based on inspection, or we could aggregate logic for latest Q. 
            // Note: The CSV might have multiple quarters. Let's stick strictly to 2025 Q2 for now as seen in the snippet.

            const vaccine = row.VACCINE_GROUP;

            // Parse numbers. They might have commas or be strings.
            const numVac = parseFloat((row.COUNT_PEOPLE_VAC || '0').toString().replace(/,/g, ''));
            const demonimator = parseFloat((row.POP_DENOMINATOR || '0').toString().replace(/,/g, ''));

            // If denominator is missing or 0 (like for "Unknown" or "Other" sometimes), we might still want to count the numerators?
            // Actually strictly speaking: percentage = (sum of numerators) / (sum of denominators)

            if (!vaccineGroups[vaccine]) {
                vaccineGroups[vaccine] = { totalVac: 0, totalPop: 0 };
            }

            if (!isNaN(numVac)) vaccineGroups[vaccine].totalVac += numVac;
            if (!isNaN(demonimator)) vaccineGroups[vaccine].totalPop += demonimator;
        });

        // Convert to array and calculate percentages
        const result = Object.keys(vaccineGroups).map(vaccine => {
            const { totalVac, totalPop } = vaccineGroups[vaccine];
            let rate = 0;
            if (totalPop > 0) {
                rate = (totalVac / totalPop); // Keep as decimal (0.95) for easy formatting
            }

            // Determine status based on generic 95% herd immunity target
            let status = 'critical';
            if (rate >= 0.95) status = 'compliant';
            else if (rate >= 0.90) status = 'warning';

            // Clean up vaccine name for display
            let displayName = vaccine;
            if (vaccine === '4:3:1:3:3:1:4') displayName = 'Combined Series (4:3:1:3:3:1:4)';

            return {
                vaccine: displayName,
                rawVaccineName: vaccine,
                rate: rate,
                displayPercentage: Math.round(rate * 100),
                status: status,
                totalVaccinated: totalVac,
                totalPopulation: totalPop
            };
        });

        // Sort by rate descending
        return result.sort((a, b) => b.rate - a.rate);
    }
}

export default new VaccineDataService();
