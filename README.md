# NY Health Dashboard

A React + TypeScript + Vite application for monitoring New York health data.

## Getting Started

### Installation

```bash
npm install
```

---

## Running the Application

The application supports two modes with separate ports and databases:

| Mode | Backend | Frontend | Database |
|------|---------|----------|----------|
| **Dev** | 5191 | 5192 | `health_dashboard_dev.db` (default) |
| **Live** | 3191 | 3000 | `health_dashboard.db` (default) |

---

### Development Mode (Hot Reload)

Starts both backend and frontend with file watching:

```bash
npm run dev
```

- Backend: http://localhost:5191
- Frontend: http://localhost:5192

---

### Live Mode (Production Preview)

Builds the application and serves in production mode:

```bash
npm run live
```

- Backend: http://localhost:3191
- Frontend: http://localhost:3000

---

### PM2 Mode (Daemon Process Manager)

For long-running production deployments:

```bash
npm start       # Start both processes via PM2
npm stop        # Stop all processes
npm restart     # Restart all processes
pm2 logs        # View live logs
```

---

## Database Configuration

The application supports both SQLite (default) and PostgreSQL 18.

### Using PostgreSQL

1.  **Environment Setup**: Add the following to your `.env` file:
    ```env
    DB_TYPE=postgres
    POSTGRES_URL=postgresql://user:password@localhost:5432/ny_health_db
    ```

2.  **Migration (Optional)**: If you have existing data in SQLite and want to move it to PostgreSQL, run the migration script:
    ```bash
    npm run migrate:postgres
    ```
    *Note: This requires `POSTGRES_URL` to be set in `.env` and the target database to exist.*

3.  **Switching Back**: To switch back to SQLite, simply remove or comment out `DB_TYPE` and `POSTGRES_URL` in your `.env` file.

---

## Additional Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build frontend for production |
| `npm run dev:frontend` | Start frontend only (dev mode) |
| `npm run dev:server` | Start backend only (dev mode with watch) |
| `npm run live:frontend` | Start frontend only (production preview) |
| `npm run live:server` | Start backend only (production mode) |
| `npm run lint` | Run ESLint |
| `npm run migrate:postgres` | Migrate data from SQLite to PostgreSQL |

---

## Single Page Application (SPA)

A lightweight version of the dashboard that runs as a standalone SPA without React or a build step.

```bash
cd SPA
npx serve .
```

---

## Data Visualization Components

![NYC Health Dashboard Overview](Documentation/assets/dashboard_screenshot.png)

### Vaccination Panel

- **Inline Progress Bars**: Color-coded horizontal bars (Green ≥90%, Amber 70-89%, Orange 50-69%, Red <50%)
- **Compact Dose Counts**: Large numbers formatted as "1.2M doses"

### Data Sources

- **NYC Childhood Vaccines**: NYC Citywide Immunization Registry (CIR) via GitHub CSV
- **HPV Vaccine**: NYC CIR (Adolescents 13-17 years)
- **NYS COVID-19/Influenza**: NY State Immunization Information System (NYSIIS) API

---

## Technical Implementation

- **Backend**: Node.js + Express with SQLite or PostgreSQL storage
- **Frontend**: React + Vite (REST & WebSocket)
- **Data Sync**: 10 AM daily automated refresh, manual trigger (3/hour rate limit)
- **Real-time**: WebSocket for live sync status updates
- **Build Optimization**: Vendor chunks for `react`, `recharts`, `framer-motion`
