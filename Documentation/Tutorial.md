# NYC Public Health Dashboard: The Complete Developer Guide

**Version**: 9.0 (Context-First Edition)
**Goal**: To take you from "Empty Folder" to "Production Health Dashboard".
**Methodology**: We start with *Why*, move to *How*, and finish with *Optimization*.

---

## 📚 Table of Contents

### Part I: Genesis
1.  **Setting Up the Environment** (Vite, TypeScript, NPM)
2.  **Hello World**: Your First Component
3.  **The Architecture**: How it all fits together

### Part II: The Purpose and Value of Public Health Data
4.  **The Problem**: Data Fragmentation
5.  **The Solution**: The "Single Pane of Glass"
6.  **The Strategy**: Visualization vs. Raw Tables

### Part III: Case Study 1 - The Disease Tracker (Visuals)
7.  **Step 1: The Contract** (TypeScript Interfaces)
8.  **Step 2: The Logic** (Fetching & Sorting CDC Data)
9.  **Step 3: The Visuals** (Card UI)
10. **Step 4: The Container** (Carousel Layout)
11. **Step 5: The Stitch** (Integration in App.tsx)

### Part IV: Case Study 2 - The Vaccination Panel (CSV)
12. **Step 1: CSV Ingestion** (How to use PapaParse)
13. **Step 2: Caching Strategy** (Why we cache large data)

### Part V: Case Study 3 - Public API Integration & Refresh Logic
14. **Step 1: The API Endpoint** (Finding the Data)
15. **Step 2: The Logic Layer** (Fetching & Aggregation)
16. **Step 3: The Persistence Layer** (Saving to IndexedDB)
17. **Step 4: The Refresh Loop** (Triggering Updates)

### Part VI: Production Systems
18. **Optimization Strategy** (Bundle Splitting)

---

## 🛠 Part I: Genesis

### 1. Setting Up the Environment

We use **Vite** because it is orders of magnitude faster than older tools.

**Step 1.1: Create the Project**
Open your terminal.
```bash
# Create a React project with TypeScript support
npm create vite@latest ny-health-dashboard -- --template react-ts

# Enter the folder
cd ny-health-dashboard
```

**Step 1.2: Install Dependencies**
We need specific libraries for data and graphs.
```bash
npm install
npm install idb-keyval papaparse recharts framer-motion
npm install -D @types/papaparse
```

**Step 1.3: Clean Up**
Delete `src/assets`, `src/App.css`. We will write our own styles.

---

### 2. Hello World: Your First Component

React components are just functions that return HTML (JSX).

**Create**: `src/components/Header.tsx`
```tsx
export function Header({ title }: { title: string }) {
    return (
        <header className="dashboard-header">
            <h1>{title}</h1>
            <span className="live-indicator">● LIVE DATA</span>
        </header>
    );
}
```
This simple component accepts a `title` property and renders it.

---

### 3. The Architecture: How it all fits together

Before we build complex features, understand the "Mental Model" of this app.
It is a **Grid of Panels**.

**The `App.tsx` (The Conductor)**
The `App` component does not know *how* to calculate vaccine rates. It just coordinates:
1.  **Fetch**: Calls `service.getAllData()`.
2.  **State**: Holds the data in memory (`useState`).
3.  **Render**: Passes data down to children (`<VaccinationPanel data={vax} />`).

This "Separation of Concerns" keeps the UI clean.

---

## 💡 Part II: The Purpose and Value of Public Health Data

Before we write code, we must understand the mission.

### 4. The Problem: Data Fragmentation
In a post-pandemic world, health data is public but **inaccessible**.
To understand your local risk, you currently effectively have to be a Data Scientist:
1.  **Visit the CDC Website**: Find the NNDSS table. Scroll past 50 states to find "NY". Navigate complex medical jargon ("Mumps" vs "Mumps, Probable").
2.  **Visit the NYC Health GitHub**: Download a raw CSV file. Open Excel. Filter rows. Calculate averages yourself.
3.  **Visit NYS Open Data**: Find the COVID-19 JSON API.

**The Reality**: 99% of citizens will simply not do this. They remain uninformed because the barrier to entry is too high.

### 5. The Solution: The "Single Pane of Glass"
Our job as engineers is **Aggregation**.
We do the hard work (scraping, parsing, cleaning) once, so the user doesn't have to.

*   **We normalize names**: "4313314" becomes "Combined Series".
*   **We aggregate sources**: CDC (National), NYS (State), and NYC (City) data sets live in one view.
*   **We contextualize**: A raw number "4,500" implies nothing. "4,500 (↗ +10% from last week)" implies action.

### 6. The Strategy: Visualization vs. Raw Tables
A government portal displays a table of 10,000 rows. This is "Transparency" but not "Clarity".
Our dashboard prioritizes **Actionable Intelligence**.

*   **The Trend Arrow**: We calculate the slope (Last Week vs This Week). A red "Up" arrow is processed by the brain in 10ms. A table of numbers takes 10 seconds.
*   **The Color Scale**: We use traffic lights (Green/Red) for vaccination rates.
*   **The Ordering**: We force "Influenza" and "COVID" to the top because they are currently statistically relevant, pushing "Rift Valley Fever" (0 cases) to the bottom.

**This is why we code**: To turn *Data* into *Meaning*.

---

## 🔬 Part III: Case Study 1 - The Disease Tracker (Visuals)

You asked: *"How was the Illness Tracker implemented?"*
We will walk through the creation of the **Disease Stats** feature (the cards showing Flu/COVID trends) step-by-step.

### Step 1: The Contract (Types)
Before writing code, we define *what* a Disease Statistic is.

**File**: `src/types/index.ts`
```typescript
interface DiseaseStats {
    name: string;        // e.g., "Influenza"
    currentCount: number; // e.g., 4500
    unit: string;        // e.g., "cases"
    weekAgo: { count: number; trend: 'up' | 'down'; };
    dataSource: string;  // e.g., "CDC"
}
```
**Why?**: TypeScript now enforces this shape. We can't accidentally forget the `dataSource`.

---

### Step 2: The Logic (Service)
We need to fetch raw data from the CDC and convert it into our clean `DiseaseStats` format.

**File**: `src/services/diseaseService.ts`

**2.1 Fetching**
```typescript
const CDC_API = 'https://data.cdc.gov/resource/x9gk-5huc.json';

export async function fetchDiseaseStats() {
    // 1. Fetch Raw JSON
    const response = await fetch(`${CDC_API}?state=NY`);
    const rawData = await response.json();
    
    // ... processing logic ...
}
```

**2.2 Sorting (The "Business Logic")**
We want user attention on the big threats. We don't just sort alphabetically.
```typescript
stats.sort((a, b) => {
    // Challenge: Force "Influenza" to the top
    if (a.name.includes('Influenza')) return -1; 
    
    // Default: Sort by Case Count (Highest first)
    return b.currentCount - a.currentCount;
});
```

---

### Step 3: The Visuals (UI Card)
Now we build the UI for a *single* card.

**File**: `src/components/DiseaseStatsCard.tsx`
```tsx
export function DiseaseStatsCard({ stat }) {
    // 1. Determine Icon based on name
    const getIcon = (name) => {
        if (name.includes('Flu')) return '🤒';
        if (name.includes('COVID')) return '🦠';
        return '📊';
    };
    
    return (
        <div className="disease-card">
            <div className="card-header">
                <span>{getIcon(stat.name)}</span>
                <h3>{stat.name}</h3>
            </div>
            <div className="big-number">
                {stat.currentCount.toLocaleString()}
            </div>
            <div className={`trend-badge ${stat.weekAgo.trend}`}>
                {stat.weekAgo.trend === 'up' ? '↗ Increasing' : '↘ Decreasing'}
            </div>
        </div>
    );
}
```

---

### Step 4: The Container (Carousel)
We have a card. Now we need a scrolling list.

**File**: `src/components/StatsCarousel.tsx`
This component manages the **Layout**.

```tsx
import { useRef } from 'react';

export const StatsCarousel = ({ stats }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    
    // Logic: Scroll left/right by 300px
    const scroll = (offset) => {
        scrollRef.current.scrollLeft += offset;
    };

    return (
        <div className="carousel-wrapper">
            <button onClick={() => scroll(-300)}>←</button>
            
            {/* The Scrollable Track */}
            <div className="track" ref={scrollRef} style={{ overflowX: 'auto' }}>
                {stats.map(stat => (
                    <DiseaseStatsCard key={stat.name} stat={stat} />
                ))}
            </div>
            
            <button onClick={() => scroll(300)}>→</button>
        </div>
    );
};
```

---

### Step 5: The Stitch (App Integration)
Finally, we connect the logic (Step 2) to the UI (Step 4) in the main App.

**File**: `src/App.tsx`
```tsx
function App() {
    const [diseases, setDiseases] = useState([]);

    useEffect(() => {
        async function load() {
            // Call the Service (Step 2)
            const data = await fetchDiseaseStats();
            setDiseases(data);
        }
        load();
    }, []);

    return (
        <main>
            <Header title="NYC Health" />
            <section className="stats-section">
                <h2>Disease Surveillance</h2>
                {diseases.length > 0 && <StatsCarousel stats={diseases} />}
            </section>
        </main>
    );
}
```

---

## 💉 Part IV: Case Study 2 - The Vaccination Panel (CSV)

### Step 1: CSV Ingestion (PapaParse)

**Why CSV?** The NYC government publishes vaccine data as a static `.csv` file on GitHub.
**The Problem**: `fetch()` returns a giant string. JavaScript can't read CSV rows natively.
**The Tool**: `PapaParse`.

**How to implement it:**
In `src/services/vaccinationService.ts`:

```typescript
import Papa from 'papaparse';

async function fetchChildhoodVaccines() {
    // 1. Fetch the raw text
    const response = await fetch(CSV_URL);
    const csvText = await response.text();

    // 2. Parse it
    // PapaParse uses callbacks, so we wrap it in a Promise to use 'await'
    return new Promise((resolve) => {
        Papa.parse(csvText, {
            header: true, // Turns "Name,Age" into {Name: "Liu", Age: "30"}
            skipEmptyLines: true,
            complete: (results) => {
                resolve(results.data); // Return the array of objects
            }
        });
    });
}
```

---

## ☁️ Part V: Case Study 3 - Public API Integration & Refresh Logic

You asked: *"How do I get data off a public API, store/cache it, and trigger a refresh?"*

We handle this centrally in `src/services/api.ts`. This file acts as the **Data Hub**.

### Step 1: The API Endpoint
First, find your URL. For NYC COVID data, it is:
`https://health.data.ny.gov/resource/xrhr-cy84.json`

### Step 2: The Logic Layer (Aggregation)
We want to fetch multiple datasets (COVID, Flu, Vaccine) at once.

```typescript
// src/services/api.ts
export async function fetchDashboardData(forceRefresh = false) {
    // 1. CHECK CACHE (Unless forcing refresh)
    if (!forceRefresh) {
        const cached = await getFromCache('dashboard_v1');
        // If we have data and it's not "stale" (older than 10 AM), return it.
        if (cached && !isStale(cached.metadata)) {
            return cached.data;
        }
    }

    // 2. FETCH PUBLIC API
    // We use Promise.all to fetch 3 APIs in parallel. Much faster!
    const [disease, vax, sewage] = await Promise.all([
        fetchDiseaseStats(),
        fetchVaccinationData(),
        fetchWastewaterData()
    ]);
    
    const data = { disease, vax, sewage };

    // 3. STORE (CACHE)
    await saveToCache('dashboard_v1', data);

    return data;
}
```

### Step 3: The Persistence Layer (IndexedDB)
We utilize `idb-keyval` to simplify IndexedDB.

```typescript
// src/services/cache.ts
import { set, get } from 'idb-keyval';

export async function saveToCache(key, data) {
    const wrapper = {
        data: data,
        metadata: { lastFetched: new Date().toISOString() }
    };
    await set(key, wrapper);
}
```
**Why IndexedDB?** It can store >100MB asynchronously. `localStorage` freezes the UI if you write 5MB.

### Step 4: The Refresh Loop
How does the "Refresh Button" in the header works?

1.  **UI Component (`Header.tsx`)**
    The user clicks "Refresh". We call a prop: `onRefresh()`.
    ```tsx
    <button onClick={onRefresh}>Refresh Data</button>
    ```

2.  **App Controller (`App.tsx`)**
    The App receives the signal and calls the Service with `true`.
    ```tsx
    const handleRefresh = async () => {
        setLoading(true);
        // "true" here is the forceRefresh flag!
        const newData = await fetchDashboardData(true);
        setData(newData);
        setLoading(false);
    };
    ```

3.  **Service (`api.ts`)**
    Because `forceRefresh` is `true`, we **SKIP** the cache check (Step 2 above) and hit the network immediately.

**Result**: You have a complete loop. User clicks -> App ignores cache -> Network Request -> New Data Saved -> UI Updates.

---

## 🚀 Part VI: Production Systems

### Optimization Strategy

When we run `npm run build`, we want the smallest file possible.
In `vite.config.ts`, `manualChunks` splits the code.

```typescript
manualChunks: {
    'vendor-charts': ['recharts'], // Put heavy chart lib in its own file
    'vendor-react': ['react', 'react-dom'] // Put React core in its own file
}
```
**Result**: The user downloads `vendor-react` once. If you change a typo in your header, they only download a tiny 1kb update file.

---

## Conclusion
You have now seen the full lifecycle of a feature:
1.  **Ingestion**: API & CSV parsing.
2.  **Persistence**: Caching in IndexedDB.
3.  **Interaction**: Force Refresh logic.

This architecture ensures a resilient, fast, and user-friendly experience.
