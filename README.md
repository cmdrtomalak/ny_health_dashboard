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

### Vaccination Panel

The Vaccination Panel uses several visualization techniques:

- **Inline Progress Bars (Horizontal Bar Charts)**: Percentage-based vaccine coverage rates are displayed with color-coded horizontal bars that fill proportionally to the rate (0-100%). Colors indicate compliance levels:
  - 🟢 Green (≥90%): Excellent compliance
  - 🟠 Amber (70-89%): Good compliance  
  - 🟠 Orange (50-69%): Fair compliance
  - 🔴 Red (<50%): Low compliance

- **Season Data Column**: Displays either:
  - Percentage rates with inline progress bars (for childhood vaccines)
  - Raw dose counts without progress bars (for COVID-19/Influenza seasonal totals)

### Data Sources

- **NYC Childhood Vaccines**: NYC Citywide Immunization Registry (CIR) via GitHub CSV
- **NYS COVID-19/Influenza**: NY State Immunization Information System (NYSIIS) via API
