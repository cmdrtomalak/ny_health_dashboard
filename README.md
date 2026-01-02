# NY Health Dashboard

A React + TypeScript + Vite application for monitoring New York health data.

## Getting Started

### Installation

```bash
npm install
```

### Development

Start the development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

### Production (Live)

There are two ways to run the application in a production-like environment:

#### 1. Preview Mode (Vite)
Build the application and serve it locally on port 8080:

```bash
npm run live
```

#### 2. Process Manager (PM2)
Run the application using PM2 as configured in `ecosystem.config.cjs`:

```bash
npm start
```

## Additional Commands

- `npm run build`: Build the application for production.
- `npm run preview`: Serve the built application (default Vite preview).
- `npm run lint`: Run ESLint to check for code quality issues.

## Data Visualization Components

![NYC Health Dashboard Overview](Documentation/assets/dashboard_screenshot.png)
*Dashboard Overview: Top-left 'Vaccination Status' showing coverage rates with inline progress bars; Top-right 'Wastewater Surveillance' graph; Bottom 'News & Alerts' ticker.*

### Vaccination Panel

The Vaccination Panel uses several visualization techniques:

- **Inline Progress Bars (Horizontal Bar Charts)**: Percentage-based vaccine coverage rates are displayed with color-coded horizontal bars that fill proportionally to the rate (0-100%).
  - Appears in **"2025 Current"** column for childhood vaccines
  - Appears in **"Season Data"** column for childhood vaccines (showing same coverage rate)
  - Colors indicate compliance levels:
    - 🟢 Green (≥90%): Excellent compliance
    - 🟠 Amber (70-89%): Good compliance  
    - 🟠 Orange (50-69%): Fair compliance
    - 🔴 Red (<50%): Low compliance

- **Compact Dose Counts**: Large numbers (like seasonal COVID/Flu doses) are formatted compactly (e.g., **"1.2M doses"**) to fit column layouts without overflow. These appear in the "Season Data" column for NYS respiratory vaccines.

### Data sources & Methodology

- **NYC Childhood Vaccines**: 
  - Source: NYC Citywide Immunization Registry (CIR) via GitHub CSV
  - **Methodology**: Rates are calculated as a **weighted average** of the pre-validated `PERC_VAC` column from source data, weighted by population. We do **not** recalculate rates from raw counts (`COUNT_PEOPLE_VAC`) as they can be noisy/inflated; we rely on the source-provided percentages.

- **NYS COVID-19/Influenza**: 
  - Source: NY State Immunization Information System (NYSIIS) via API
  - **Methodology**: Aggregates total dose counts for the current respiratory season (e.g., 2024-2025) for the "Rest of State" geography.

## Technical Implementation

- **Caching**: Vaccination data is cached in the browser's **IndexedDB** (`idb-keyval`) to minimize API calls and improve load performance.
- **Build Optimization**: Vendor libraries (`react`, `recharts`, `framer-motion`) are split into separate chunks to ensure optimal bundle size and loading speed.
