# NYC/NYS Health Dashboard - SPA (Real Data)

This is a lightweight, dependency-free Single Page Application (SPA) version of the health dashboard. It provides real-time monitoring of disease surveillance and health metrics in New York using direct public API integration.

## Key Features

- **Direct API Integration**: Fetches real-time data directly from CDC NNDSS, NYC Open Data, and NYS Health portals.
- **No Build Step**: Pure HTML/CSS/JS that runs in any modern browser.
- **Real-Time Updates**: Automatically refreshes data every 5 minutes to ensure current metrics.
- **Universal Access**: Runs on any simple HTTP server without backend dependencies.

## Architecture

The SPA has been upgraded from a mock/simulated environment to a real data dashboard:

- **Disease Surveillance**: Fetches from CDC NNDSS (Weekly National Notifiable Diseases Surveillance System) and NYC Open Data (COVID-19 Daily Counts).
- **Wastewater Monitoring**: Integrates with NYS Wastewater Surveillance data for SARS-CoV-2 concentrations.
- **Vaccination Coverage**: Combines NYS NYSIIS seasonal dose counts with NYC Health's validated childhood immunization surveys.
- **Health Alerts**: Scrapes official news feeds from NYC DOHMH, NYS Health, and CDC Health Alert Network.

## Running the Dashboard

### 1. Serve the Directory
Since the SPA uses `fetch` and ES6 features, it must be served via a web server (not opened via `file://`).

```bash
# From the project root
cd SPA

# Using Python 3
python3 -m http.server 8080

# Using Node.js
npx serve . -p 3000
```

### 2. Access the Dashboard
Open your browser to [http://localhost:3000](http://localhost:3000).

## Data Sources

- **CDC NNDSS API**: Weekly case counts for tracked diseases like Measles, Mpox, and Pertussis.
- **NYC Open Data**: Daily COVID-19 case counts and hospitalizations.
- **NYS Open Data**: Wastewater pathogen concentrations and respiratory vaccine dose counts.
- **CDC News**: Health Alert Network RSS feed.
- **NYC Health GitHub**: Validated childhood vaccination coverage rates.

## Technical Details

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3.
- **Libraries**: [PapaParse](https://www.papaparse.com/) (CDN) for parsing GitHub CSV data.
- **Styling**: Modern CSS with glassmorphism and responsive layout.
- **Refresh Logic**: Automatic polling every 5 minutes with manual refresh button support.