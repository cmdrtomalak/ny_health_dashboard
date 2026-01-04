// NYC/NYS Public Health Dashboard - SPA Implementation

// --- Constants & Config ---
const CDC_NNDSS_API = 'https://data.cdc.gov/resource/x9gk-5huc.json';
const FLU_API = 'https://api.delphi.cmu.edu/epidata/fluview/?regions=hhs2&epiweeks=202501';
const NYC_WASTEWATER_API = 'https://health.data.ny.gov/resource/hdxs-icuh.json';
const NYS_VAX_API = 'https://health.data.ny.gov/resource/xrhr-cy84.json';
const CHILDHOOD_DATA_URL = 'https://raw.githubusercontent.com/nychealth/immunization-data/main/demo/Main_Routine_Vaccine_Demo.csv';
const CDC_RSS_FEED = 'https://tools.cdc.gov/api/v2/resources/media/132608.rss';
const NYC_NEWS_URL = 'https://corsproxy.io/?' + encodeURIComponent('https://www.nyc.gov/site/doh/about/press/recent-press-releases.page');
const NYS_NEWS_URL = 'https://corsproxy.io/?' + encodeURIComponent('https://info.nystateofhealth.ny.gov/news');

const TRACKED_DISEASES = [
    'Chikungunya virus disease', 'Diphtheria', 'Marburg virus disease', 'Measles',
    'Mpox', 'Influenza-associated pediatric mortality', 'Novel Influenza A virus infections',
    'Pertussis', 'Poliomyelitis, paralytic', 'Rift Valley fever', 'COVID-19'
];

// --- Helper Functions ---
function calculateTrend(current, previous) {
    const percentChange = previous === 0 ? 0 : ((current - previous) / previous) * 100;
    let trend;
    if (percentChange > 5) trend = 'rising';
    else if (percentChange < -5) trend = 'falling';
    else trend = 'stable';
    return { trend, percentChange: Math.round(percentChange * 10) / 10, count: previous };
}

function createTrend(val) {
    return { count: val, trend: 'stable', percentChange: 0 };
}

// --- Data Fetching Functions ---

async function fetchDiseaseStats() {
    try {
        console.log('[DiseaseService] Fetching disease stats...');

        // Fetch data from multiple sources in parallel
        const [nndssResponse, covidResponse, fluResponse] = await Promise.all([
            fetch(`${CDC_NNDSS_API}?$where=(location1='NEW YORK' OR location1='NEW YORK CITY')&$order=year DESC, week DESC&$limit=5000`),
            fetch(`https://data.cityofnewyork.us/resource/rc75-m7u3.json?$limit=5&$order=date_of_interest DESC`),
            fetch(FLU_API)
        ]);

        const nndssData = nndssResponse.ok ? await nndssResponse.json() : [];
        const covidData = covidResponse.ok ? await covidResponse.json() : [];
        const fluData = fluResponse.ok ? await fluResponse.json() : {};

        // Process COVID Data (NYC Open Data)
        let covidCount = 0;
        let covidDate = new Date().toISOString();
        if (covidData.length > 0) {
            const latest = covidData[0];
            covidCount = (parseInt(latest.case_count) || 0) + (parseInt(latest.probable_case_count) || 0);
            covidDate = latest.date_of_interest;
        }

        // Process Flu Data (Delphi ILI for HHS2 Region - NY/NJ)
        let fluCount = 0;
        let fluDate = new Date().toISOString();
        if (fluData.epidata && fluData.epidata.length > 0) {
            fluCount = fluData.epidata[0].num_ili || 0;
        }

        // Initialize separate maps for NYC and NYS
        const diseaseMapNYC = new Map();
        const diseaseMapNYS = new Map();

        TRACKED_DISEASES.forEach(d => {
            diseaseMapNYC.set(d, { current: 0, yearAgo: 0 });
            diseaseMapNYS.set(d, { current: 0, yearAgo: 0 });
        });

        // Add COVID (NYC specific)
        if (covidCount > 0) {
            diseaseMapNYC.set('COVID-19', {
                current: covidCount, yearAgo: 0, source: 'NYC Open Data', url: 'https://data.cityofnewyork.us/Health/COVID-19-Daily-Counts-of-Cases-Hospitalizations-/rc75-m7u3'
            });
        }

        // Add Flu (Shared region data)
        if (fluCount > 0) {
            // We'll add a specific "Influenza (ILI)" item later, but let's track strict influenza cases too if NNDSS has them
        }

        // Process NNDSS Data
        nndssData.forEach(record => {
            const loc = (record.location1 || '').toUpperCase();
            if (!loc.includes('NEW YORK')) return;

            const targetMap = loc === 'NEW YORK CITY' ? diseaseMapNYC : diseaseMapNYS;

            const disease = TRACKED_DISEASES.find(d => record.label && (record.label.includes(d) || d.includes(record.label)));
            if (disease) {
                if (disease.includes('COVID') && loc === 'NEW YORK CITY' && covidCount > 0) return; // Skip if we have better source

                let count = 0;
                if (record.m1 && record.m1 !== '-') count = parseInt(record.m1);

                if (!isNaN(count)) {
                    const stats = targetMap.get(disease);
                    stats.current += count;
                    targetMap.set(disease, stats);
                }
            }
        });

        const processMapToStats = (map, regionLabel) => {
            const stats = [];
            for (const [name, counts] of map.entries()) {
                stats.push({
                    name: name,
                    currentCount: counts.current,
                    weekAgo: createTrend(0),
                    monthAgo: createTrend(0),
                    twoMonthsAgo: createTrend(0),
                    yearAgo: createTrend(counts.yearAgo),
                    unit: name.includes('COVID') ? 'cases (daily)' : 'cases (YTD)',
                    lastUpdated: name.includes('COVID') ? covidDate : new Date().toISOString(),
                    dataSource: counts.source || 'CDC NNDSS',
                    sourceUrl: counts.url || 'https://data.cdc.gov/NNDSS/NNDSS-Weekly-Data/x9gk-5huc'
                });
            }

            // Manually add Flu ILI
            if (fluCount > 0) {
                stats.push({
                    name: 'Influenza (ILI)',
                    currentCount: fluCount,
                    weekAgo: createTrend(0), monthAgo: createTrend(0), twoMonthsAgo: createTrend(0), yearAgo: createTrend(0),
                    unit: 'visits',
                    lastUpdated: fluDate,
                    dataSource: 'CDC ILINet',
                    sourceUrl: 'https://github.com/cmu-delphi/delphi-epidata'
                });
            }

            // Sort
            return stats.sort((a, b) => b.currentCount - a.currentCount);
        };

        return {
            nyc: processMapToStats(diseaseMapNYC, 'NYC'),
            nys: processMapToStats(diseaseMapNYS, 'NYS')
        };

    } catch (error) {
        console.error('Disease stats fetch failed:', error);
        return { nyc: [], nys: [] };
    }
}

async function fetchWastewaterData() {
    try {
        console.log('[WastewaterService] Fetching wastewater data...');
        const response = await fetch(`${NYC_WASTEWATER_API}?$order=samplecollectdate DESC&$limit=1000`);
        if (!response.ok) throw new Error('Failed to fetch wastewater data');
        const rawData = await response.json();

        // Process samples (defaulting to SARS-CoV-2)
        const samples = rawData.map(r => ({
            date: (r.samplecollectdate || '').split('T')[0],
            location: r.wwtpname,
            concentration: parseFloat(r.pcrtargetavgconc) || 0
        })).filter(s => !isNaN(s.concentration));

        const avg = samples.reduce((acc, curr) => acc + curr.concentration, 0) / (samples.length || 1);

        return {
            samples: samples.slice(0, 50).reverse(), // Take recent ones
            averageConcentration: Math.round(avg),
            trend: 'stable',
            alertLevel: avg > 1000 ? 'high' : avg > 500 ? 'moderate' : 'low',
            lastUpdated: new Date().toISOString()
        };
    } catch (e) {
        console.error('Wastewater fetch failed:', e);
        return { samples: [], averageConcentration: 0, trend: 'stable', alertLevel: 'low' };
    }
}

async function fetchVaccinationData() {
    try {
        console.log('[VaccinationService] Fetching vaccination data...');

        // Fetch NYS Flu/Covid (Rest of State)
        const nysResponse = await fetch(`${NYS_VAX_API}?geography_level=REST%20OF%20STATE&$limit=1000`);
        let covidTotal = 0;
        let fluTotal = 0;
        let latestDate = '';
        const season = '2024-2025';

        if (nysResponse.ok) {
            const data = await nysResponse.json();
            if (data.length > 0) {
                data.forEach(record => {
                    covidTotal += parseInt(record.covid_19_dose_count) || 0;
                    fluTotal += parseInt(record.influenza_dose_count) || 0;
                });
                const sorted = data.sort((a, b) => new Date(b.week_ending) - new Date(a.week_ending));
                if (sorted.length > 0) latestDate = sorted[0].week_ending.split('T')[0];
            }
        }

        const statsVax = [
            {
                name: 'COVID-19 (Seasonal Doses)',
                currentYear: 0, fiveYearsAgo: -1, tenYearsAgo: -1,
                lastAvailableRate: covidTotal,
                lastAvailableDate: `${season} Season (as of ${latestDate})`,
                collectionMethod: 'NYS Immunization Information System',
                isReportingStopped: false
            },
            {
                name: 'Influenza (Seasonal Doses)',
                currentYear: 0, fiveYearsAgo: -1, tenYearsAgo: -1,
                lastAvailableRate: fluTotal,
                lastAvailableDate: `${season} Season (as of ${latestDate})`,
                collectionMethod: 'NYS Immunization Information System',
                isReportingStopped: false
            }
        ];

        // Fetch Childhood Data (NYC)
        let childhoodStats = [];
        try {
            const csvResponse = await fetch(CHILDHOOD_DATA_URL);
            if (csvResponse.ok) {
                const csvText = await csvResponse.text();
                const parseResult = Papa.parse(csvText, { header: true, skipEmptyLines: true });

                // Process processed rows... simplified version of React logic
                const rows = parseResult.data;
                const vaccineGroups = {};
                const latestYear = '2025';

                rows.forEach(row => {
                    if (row.YEAR_COVERAGE !== latestYear) return;
                    if (row.QUARTER && row.QUARTER !== 'Q2') return;

                    const vacName = row.VACCINE_GROUP;
                    const pop = parseFloat((row.POP_DENOMINATOR || '0').toString().replace(/,/g, ''));
                    const perc = parseFloat((row.PERC_VAC || '0').toString().replace(/,/g, ''));

                    if (!vaccineGroups[vacName]) vaccineGroups[vacName] = { weightedPercSum: 0, totalPop: 0 };
                    if (!isNaN(pop) && pop > 0 && !isNaN(perc)) {
                        vaccineGroups[vacName].weightedPercSum += perc * pop;
                        vaccineGroups[vacName].totalPop += pop;
                    }
                });

                Object.keys(vaccineGroups).forEach(v => {
                    const { weightedPercSum, totalPop } = vaccineGroups[v];
                    const rate = totalPop > 0 ? weightedPercSum / totalPop : 0;
                    childhoodStats.push({
                        name: v,
                        currentYear: parseFloat(rate.toFixed(1)),
                        fiveYearsAgo: -1, tenYearsAgo: -1,
                        lastAvailableRate: parseFloat(rate.toFixed(1)),
                        lastAvailableDate: `${latestYear} Q2`,
                        collectionMethod: 'NYC Citywide Immunization Registry',
                        isReportingStopped: false
                    });
                });
            }
        } catch (csvErr) {
            console.warn('Childhood vaccine fetch failed:', csvErr);
        }

        const sortVaccines = (list) => [...list].sort((a, b) => {
            const aIsPriority = a.name.includes('COVID') || a.name.includes('Influenza');
            const bIsPriority = b.name.includes('COVID') || b.name.includes('Influenza');
            if (aIsPriority && !bIsPriority) return -1;
            if (!aIsPriority && bIsPriority) return 1;
            return 0;
        });

        return {
            nyc: sortVaccines([...statsVax, ...childhoodStats]),
            nys: sortVaccines([...statsVax]),
            lastUpdated: new Date().toISOString()
        };

    } catch (e) {
        console.error('Vaccination fetch failed', e);
        return { nyc: [], nys: [], lastUpdated: new Date().toISOString() };
    }
}

async function fetchNewsData() {
    console.log('[NewsService] Fetching news...');

    async function fetchFromSource(url, parserFn, type) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('Fetch failed');
            const text = await res.text();
            const parser = new DOMParser();

            if (type === 'xml') {
                const doc = parser.parseFromString(text, 'text/xml');
                return parserFn(doc);
            } else {
                const doc = parser.parseFromString(text, 'text/html');
                return parserFn(doc);
            }
        } catch (e) {
            console.warn(`News fetch failed for ${url}:`, e);
            return [];
        }
    }

    const nycNews = await fetchFromSource(NYC_NEWS_URL, (doc) => {
        const alerts = [];
        doc.querySelectorAll('p').forEach(p => {
            const strong = p.querySelector('strong');
            const link = p.querySelector('a');
            if (strong && link) {
                alerts.push({
                    title: link.textContent?.trim(),
                    date: strong.textContent?.trim(),
                    severity: 'info',
                    source: 'NYC Health',
                    url: 'https://www.nyc.gov' + (link.getAttribute('href') || '')
                });
            }
        });
        return alerts.slice(0, 5);
    }, 'html');

    const nysNews = await fetchFromSource(NYS_NEWS_URL, (doc) => {
        const alerts = [];
        doc.querySelectorAll('article.node--type-news').forEach(article => {
            const link = article.querySelector('h2.node__title a');
            const dateElem = article.querySelector('.field--name-field-publication-date time');
            if (link) {
                alerts.push({
                    title: link.textContent?.trim(),
                    date: dateElem?.textContent?.trim(),
                    severity: 'info',
                    source: 'NYS Health',
                    url: 'https://info.nystateofhealth.ny.gov' + (link.getAttribute('href') || '')
                });
            }
        });
        return alerts.slice(0, 5);
    }, 'html');

    const cdcNews = await fetchFromSource(CDC_RSS_FEED, (doc) => {
        return Array.from(doc.querySelectorAll('item')).slice(0, 5).map(item => ({
            title: item.querySelector('title')?.textContent,
            summary: item.querySelector('description')?.textContent,
            date: item.querySelector('pubDate')?.textContent,
            severity: 'warning',
            source: 'CDC',
            url: item.querySelector('link')?.textContent
        }));
    }, 'xml');

    return {
        nyc: nycNews,
        nys: nysNews,
        usa: cdcNews,
        lastUpdated: new Date().toISOString()
    };
}


// --- UI Rendering Functions ---

function renderDiseaseStatsCard(stat, region) {
    // Only show trend icons if we actually have trend data (which we mostly won't for real data right now, defaulting to stable)
    const getTrendIcon = (trend) => {
        switch (trend) {
            case 'rising': return '📈';
            case 'falling': return '📉';
            default: return '➡️';
        }
    };

    // Format large numbers
    const countDisplay = stat.currentCount.toLocaleString();

    return `
        <div class="disease-stats-card">
            <h4 class="disease-name">${stat.name}</h4>
            <div class="current-count">
                ${countDisplay}
                <span class="count-unit">${stat.unit}</span>
            </div>
            <div class="trend-indicator">
                <span class="trend-period">Last updated: ${new Date(stat.lastUpdated).toLocaleDateString()}</span>
            </div>
            ${stat.dataSource ? `<div class="data-source-text">Source: ${stat.dataSource}</div>` : ''}
        </div>
    `;
}

function renderStatsCarousel(title, icon, stats, region) {
    const statsCards = stats.length > 0
        ? stats.map(stat => renderDiseaseStatsCard(stat, region)).join('')
        : '<div class="no-data-msg">No recent disease data available.</div>';

    return `
        <div class="stats-carousel-container">
            <div class="carousel-header">
                <h3 class="region-title">
                    <span class="region-flag">${icon}</span>
                    ${title}
                </h3>
            </div>
            <div class="carousel-wrapper">
                <button class="carousel-btn left-floating" onclick="scrollCarousel('${region}-track', 'left')">←</button>
                <div class="stats-track" id="${region}-track">
                    ${statsCards}
                </div>
                <button class="carousel-btn right-floating" onclick="scrollCarousel('${region}-track', 'right')">→</button>
            </div>
        </div>
    `;
}

function renderNewsItem(alert) {
    const formatDate = (dateStr) => {
        try {
            return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch (e) { return dateStr; }
    };

    return `
        <div class="news-item news-${alert.severity}">
            <div class="news-item-header">
                <span class="news-severity-icon">${alert.severity === 'warning' ? '⚠️' : 'ℹ️'}</span>
                <span class="news-date">${formatDate(alert.date)}</span>
                <span class="news-source">${alert.source}</span>
            </div>
            <h4 class="news-title">${alert.title}</h4>
            ${alert.summary ? `<p class="news-summary">${alert.summary}</p>` : ''}
            ${alert.url ? `<a href="${alert.url}" target="_blank" rel="noopener noreferrer" class="news-link">Read more →</a>` : ''}
        </div>
    `;
}

function renderNewsSection(title, region, alerts, isExpanded) {
    if (!alerts || alerts.length === 0) return '';
    const newsItems = alerts.map(alert => renderNewsItem(alert)).join('');

    return `
        <div class="news-section ${isExpanded ? 'expanded' : ''}" id="news-${region}">
            <button class="news-section-header" onclick="toggleNewsSection('${region}')">
                <div class="section-title-group">
                    <span class="section-icon">${region === 'NYC' ? '🗽' : region === 'NYS' ? '🏛️' : '🇺🇸'}</span>
                    <h3 class="section-title">${title}</h3>
                </div>
                <div class="section-badges">
                    <span class="expand-icon">${isExpanded ? '−' : '+'}</span>
                </div>
            </button>
            ${isExpanded ? `
                <div class="news-section-content">
                    ${newsItems}
                </div>
            ` : ''}
        </div>
    `;
}

function renderWastewaterMonitor(data) {
    return `
        <div class="wastewater-monitor">
            <div class="monitor-header">
                <span class="monitor-icon">🦠</span>
                <h3 class="monitor-title">Wastewater Surveillance</h3>
            </div>
            <div class="wastewater-stats">
                <div class="stat-card">
                    <div class="stat-value">${data.averageConcentration || 0}</div>
                    <div class="stat-label">Avg Concentration</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${data.samples.length}</div>
                    <div class="stat-label">Samples</div>
                </div>
            </div>
            <div class="alert-level alert-${data.alertLevel}">
                Alert Level: ${data.alertLevel.toUpperCase()}
            </div>
        </div>
    `;
}

function renderVaccinationPanel(data) {
    const renderVaccineRow = (vaccine) => {
        let displayRate = vaccine.currentYear + '%';
        if (vaccine.lastAvailableRate !== undefined && vaccine.currentYear === 0) {
            // It's a raw count (dose count) not percentage
            displayRate = vaccine.lastAvailableRate.toLocaleString();
        }

        return `
        <tr>
            <td class="vaccine-name">${vaccine.name}</td>
            <td class="vaccination-rate">${displayRate}</td>
            <td class="vaccination-date">${vaccine.lastAvailableDate || 'N/A'}</td>
        </tr>
    `};

    const nycRows = data.nyc.map(renderVaccineRow).join('');
    const nysRows = data.nys.map(renderVaccineRow).join('');

    return `
        <div class="vaccination-panel">
            <div class="vaccination-header">
                <span class="vaccination-icon">💉</span>
                <h3 class="vaccination-title">Vaccination Coverage</h3>
            </div>
            
            <h4 style="color: white; margin: 1.5rem 0 1rem 0; font-size: 1.1rem;">New York City</h4>
            <table class="vaccination-table">
                <thead>
                    <tr>
                        <th>Vaccine</th>
                        <th>Rate / Count</th>
                        <th>Period</th>
                    </tr>
                </thead>
                <tbody>${nycRows}</tbody>
            </table>

            <h4 style="color: white; margin: 1.5rem 0 1rem 0; font-size: 1.1rem;">New York State (Rest of State)</h4>
            <table class="vaccination-table">
                <thead>
                    <tr>
                        <th>Vaccine</th>
                        <th>Count</th>
                        <th>Period</th>
                    </tr>
                </thead>
                <tbody>${nysRows}</tbody>
            </table>
        </div>
    `;
}

// --- State & Main Logic ---

let dashboardData = null;
let expandedNewsSections = new Set(['nyc', 'usa']);

async function loadData(forceRefresh = false) {
    const loadingScreen = document.getElementById('loading-screen');
    const errorScreen = document.getElementById('error-screen');
    const dashboard = document.getElementById('dashboard');
    const refreshBtn = document.getElementById('refresh-btn');

    try {
        if (!forceRefresh) loadingScreen.style.display = 'flex';
        errorScreen.style.display = 'none';

        if (refreshBtn) {
            refreshBtn.classList.add('loading');
            refreshBtn.querySelector('.refresh-text').textContent = 'Refreshing...';
        }

        const [diseaseStats, wastewaterData, vaccinationData, newsData] = await Promise.all([
            fetchDiseaseStats(),
            fetchWastewaterData(),
            fetchVaccinationData(),
            fetchNewsData()
        ]);

        dashboardData = { diseaseStats, wastewaterData, vaccinationData, newsData };

        renderDashboard();

        loadingScreen.style.display = 'none';
        dashboard.style.display = 'block';

        const lastUpdated = document.getElementById('last-updated');
        if (lastUpdated) lastUpdated.textContent = 'Last updated: Just now';

    } catch (error) {
        console.error('Error loading data:', error);
        loadingScreen.style.display = 'none';
        errorScreen.style.display = 'flex';
    } finally {
        if (refreshBtn) {
            refreshBtn.classList.remove('loading');
            refreshBtn.querySelector('.refresh-text').textContent = 'Refresh';
        }
    }
}

function renderDashboard() {
    if (!dashboardData) return;

    const newsSections = document.getElementById('news-sections');
    if (newsSections) {
        newsSections.innerHTML =
            renderNewsSection('New York City', 'NYC', dashboardData.newsData.nyc, expandedNewsSections.has('NYC')) +
            renderNewsSection('New York State', 'NYS', dashboardData.newsData.nys, expandedNewsSections.has('NYS')) +
            renderNewsSection('United States', 'USA', dashboardData.newsData.usa, expandedNewsSections.has('USA'));
    }

    const nycCarousel = document.getElementById('nyc-carousel');
    if (nycCarousel) nycCarousel.innerHTML = renderStatsCarousel('New York City', '🗽', dashboardData.diseaseStats.nyc, 'nyc');


    const wastewaterMonitor = document.getElementById('wastewater-monitor');
    if (wastewaterMonitor) wastewaterMonitor.innerHTML = renderWastewaterMonitor(dashboardData.wastewaterData);

    const vaccinationPanel = document.getElementById('vaccination-panel');
    if (vaccinationPanel) vaccinationPanel.innerHTML = renderVaccinationPanel(dashboardData.vaccinationData);
}

function toggleNewsSection(region) {
    if (expandedNewsSections.has(region)) expandedNewsSections.delete(region);
    else expandedNewsSections.add(region);
    renderDashboard();
}

function scrollCarousel(trackId, direction) {
    const track = document.getElementById(trackId);
    if (track) {
        track.scrollBy({ left: direction === 'left' ? -320 : 320, behavior: 'smooth' });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => loadData());
setInterval(() => loadData(true), 5 * 60 * 1000);