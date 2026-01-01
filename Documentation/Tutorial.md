# Building the NYC Public Health Dashboard: A Comprehensive Tutorial

**Audience**: Novice to Intermediate Developers
**Goal**: Build a production-grade Health Dashboard using React, TypeScript, and Vite.
**Estimated Length**: Equivalent to a 40-page technical guide.

---

## 📚 Table of Contents
1.  **Introduction & Prerequisites**
2.  **The Tech Stack: Deep Dive**
3.  **Project Initialization & Setup**
4.  **React Fundamentals: Components & State**
5.  **Data Architecture: The Service Layer Pattern**
6.  **Working with Data: Fetch, APIs, and CSVs**
7.  **Data Persistence: IndexedDB Caching**
8.  **Visualizing Data: Custom UI Components**
9.  **Performance & Production Optimization**

---

## 1. Introduction & Prerequisites

Welcome to this comprehensive guide on building the **NYC/NYS Public Health Dashboard**. You are not just building a "Hello World" app; you are building a real-world data visualization tool that aggregates critical public health information from CDC, NYC, and NYS government sources.

By the end of this tutorial, you will understand how to:
*   Structure a scalable React application.
*   Fetch and aggregate data from multiple disparate API sources.
*   Cache data locally to ensure your app works instantly (even with slow internet).
*   Visualize complex data like vaccination rates with custom-built components.

### Prerequisites
*   **Node.js**: Installed on your machine (v18+ recommended).
*   **VS Code**: Or any modern code editor.
*   **Basic JavaScript Knowledge**: Variables, functions, and loops.

---

## 2. The Tech Stack: Deep Dive

We chose specific technologies for this project. Here is **why**:

### 2.1 React (The UI Library)
React is a Javascript library for building user interfaces.
*   **Why?**: It allows us to break our complex dashboard into small, reusable "lego blocks" called **Components** (e.g., `Header`, `VaccinationPanel`).
*   **Key Concept**: **Virtual DOM**. React keeps a virtual copy of your HTML. When data changes, it compares the copy to the real one and only updates what changed. This makes it incredibly fast.

### 2.2 TypeScript (The Safety Net)
TypeScript is "JavaScript with types".
*   **Why?**: In a data dashboard, it's easy to make mistakes (e.g., trying to read `vaccine.rate` when the API calls it `vaccine.percentage`). TypeScript won't let your code compile if you make these mistakes.
*   **Key Concept**: **Interfaces**. We define what our data looks like *before* we write logic.

### 2.3 Vite (The Build Tool)
Vite (French for "Quick") is a build tool that replaces older tools like Webpack.
*   **Why?**: It starts the server instantly. It serves code as native ES Modules, meaning your browser does the heavy lifting during development, making it feel instantaneous.

---

## 3. Project Initialization & Setup

Let's start from zero.

### Step 3.1: Create the Project
Open your terminal and run:

```bash
npm create vite@latest ny-health-dashboard -- --template react-ts
cd ny-health-dashboard
npm install
```

### Step 3.2: Clean Up
Delete `src/App.css` and `src/assets`. We want a clean slate.

### Step 3.3: Install Dependencies
We need a few tools:
`npm install idb-keyval papaparse recharts framer-motion`

*   **idb-keyval**: Simple wrapper for IndexedDB (storage).
*   **papaparse**: Powerful CSV parser (for our NYC GitHub data).
*   **recharts**: For drawing graphs (Wastewater).

---

## 4. React Fundamentals: Components & State

React apps are trees of components. Our root is `App.tsx`.

### 4.1 The Component Mental Model
Think of a component as a JavaScript function that returns HTML (JSX).

```tsx
// src/components/Header.tsx
export function Header({ title }: { title: string }) {
    return <header><h1>{title}</h1></header>;
}
```

### 4.2 State (useState)
State is the "memory" of a component.
If you use a normal variable (`let count = 0`), the UI won't update when it changes. You need `useState`.

```tsx
const [vaccineData, setVaccineData] = useState<Vaccine[]>([]);
```
When you call `setVaccineData([...])`, React knows: "Aha! State changed. I must re-render the screen."

### 4.3 Side Effects (useEffect)
We need to fetch data *after* the component loads. `useEffect` handles this side effect.

```tsx
useEffect(() => {
    // This runs ONCE when the component mounts
    fetchData();
}, []);
```

---

## 5. Data Architecture: The Service Layer Pattern

**Novice Mistake**: Writing `fetch('https://api...')` directly inside your React components.
**Pro Approach**: Create a `services/` folder.

### Why separate services?
1.  **Reusability**: You can call `fetchVaccinationData()` from anywhere.
2.  **Testing**: You can test the logic without rendering the UI.
3.  **Cleanliness**: Your UI code focuses on *showing* data, not *fetching* it.

**Structure**:
```text
src/
  components/  (Visuals)
  services/    (Logic)
    vaccinationService.ts
    diseaseService.ts
```

---

## 6. Working with Data: Fetch, APIs, and CSVs

Our dashboard is unique because it combines different data formats.

### 6.1 Fetching JSON (NYS API)
```typescript
// src/services/vaccinationService.ts
// We fetch 'REST OF STATE' data to aggregate doses for the season
const response = await fetch(`${NYS_VAX_API}?geography_level=REST%20OF%20STATE&$limit=1000`);
if (!response.ok) throw new Error('API Error');

const data: NYSVaxRecord[] = await response.json();

// Example: Aggregating doses (summing weekly counts)
let covidTotal = 0;
for (const record of data) {
    covidTotal += parseInt(record.covid_19_dose_count) || 0;
}
```
*Note*: Always use `try/catch` blocks to handle network errors gracefully.

### 6.2 Fetching CSV (NYC GitHub)
NYC publishes data as a CSV file on GitHub. Browsers don't natively parse CSV. We use `PapaParse`.

```typescript
// src/services/vaccinationService.ts
import Papa from 'papaparse';

const response = await fetch(CHILDHOOD_DATA_URL);
const text = await response.text();

Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
        const rows = results.data as ChildhoodVaccineRaw[];
        // Now process the raw rows
        const processedData = processChildhoodRows(rows);
        resolve(processedData);
    }
});
```

### 6.3 Aggregation & Logic
This is where the magic happens. We don't just display raw data; we process it.
### 6.3.1 Weighted Average Logic
We don't simply average the percentages. We weight them by population to ensure small counties don't skew the result.

```typescript
// src/services/vaccinationService.ts
function processChildhoodRows(rows: ChildhoodVaccineRaw[]) {
    // ... filtering logic ...
    
    // Accumulate weighted sums
    vaccineGroups[vacName].weightedPercSum += perc * pop;
    vaccineGroups[vacName].totalPop += pop;

    // Calculate final weighted rate
    // Rate = Sum(Percentage * Population) / Sum(Population)
    const rate = totalPop > 0 ? weightedPercSum / totalPop : 0;
    
    return rate;
}
```

### 6.3.2 Data Normalization
We map confusing codes to readable names using a lookup object.

```typescript
const VACCINE_NAME_MAP: Record<string, string> = {
    '4313314': 'Combined 7-Vaccine Series (4:3:1:3:3:1:4)',
    'DTaP': 'DTaP (Diphtheria, Tetanus, Pertussis)',
    // ...
};
```

---

## 7. Data Persistence: IndexedDB Caching

Users hate loading screens. We use **Caching** to save data on their device.

### 7.1 LocalStorage vs IndexedDB
*   **LocalStorage**: Simple (key-value), but synchronous (freezes UI) and small (5MB).
*   **IndexedDB**: Massive storage, asynchronous (smooth UI), but harder to use.

We used `idb-keyval` to make IndexedDB as easy as LocalStorage.

### 7.2 The "Stale-While-Revalidate" Strategy
1.  **Check Cache**: Is data there? If yes, show it immediately.
2.  **Check Freshness**: Is it older than 10 AM today?
3.  **Fetch**: If stale, fetch new data in the background and update the cache.

```typescript
// src/services/cache.ts
export function shouldRefreshCache(metadata: CacheMetadata): boolean {
    const now = new Date();
    const lastFetched = new Date(metadata.lastFetched);
    const REFRESH_HOUR = 10; // 10 AM
    const currentHour = now.getHours();

    // Check if we passed the 10 AM threshold today
    const isPastRefreshHour = currentHour >= REFRESH_HOUR;
    const fetchedToday = lastFetched.toDateString() === now.toDateString();
    
    // If it's past 10 AM, but our last fetch wasn't today (after 10 AM), we refresh.
    if (isPastRefreshHour && !fetchedToday) {
        return true; 
    }
    return false;
}
```

This makes the app feel **instantly responsive**.

---

## 8. Visualizing Data: Custom UI Components

We avoided using heavy chart libraries for simple things.

### 8.1 The Inline Progress Bar
Instead of a chart, we built a simple HTML/CSS bar.

```tsx
<div className="bar-container">
  <div 
    className="bar-fill" 
    style={{ width: `${rate}%`, background: rate > 90 ? 'green' : 'red' }} 
  />
</div>
```
This is extremely performant and lightweight compared to loading a charting library.

---

## 9. Performance & Production Optimization

### 9.1 Bundle Splitting
When we run `npm run build`, Vite bundles all our code into one file. If that file is too big (500kB+), the site loads slowly.

We configured `vite.config.ts` to use **manualChunks**:
```typescript
manualChunks: {
    'vendor-react': ['react', 'react-dom'], // Chunk 1
    'vendor-ui': ['recharts'],              // Chunk 2
}
```
This means the browser can cache React separately from our graph library.

### 9.2 TypeScript Strict Mode
We enabled strict mode in `tsconfig.json`. It forces us to handle `null` and `undefined`.
*   *Novice View*: "It's annoying!"
*   *Pro View*: "It prevents the White Screen of Death for my users."

---

## Final Thoughts

You have now toured the entire architecture of a professional React application. We covered:
1.  **Project Organization** (Features vs Services)
2.  **Data Strategy** (Aggregation, Normalization, Caching)
3.  **UI Performance** (Virtual DOM, Splitting)

**Next Steps for You**:
Try cloning this repo and adding a new feature. Ideally, try adding a "Hospital Capacity" panel by finding a new API. Use the same `service -> component` pattern you learned here.

Happy Coding!
