# Migration Plan: SQLite to PostgreSQL 18

This plan outlines the steps to safely migrate the NY Health Dashboard database from SQLite to PostgreSQL 18 on Ubuntu 24.04.

## Prerequisites
- PostgreSQL 18 installed and running.
- Access to the terminal with `sudo` privileges.
- Existing SQLite database file (usually in `./server/data/`).

---

## Phase 1: PostgreSQL Setup
Since the database hasn't been created yet, you need to set up the Postgres environment.

1.  **Switch to postgres user**:
    ```bash
    sudo -u postgres psql
    ```

2.  **Create the Database and User**:
    Run the following SQL commands in the `psql` prompt:
    ```sql
    CREATE DATABASE ny_health_db;
    CREATE USER health_admin WITH ENCRYPTED PASSWORD 'your_secure_password';
    GRANT ALL PRIVILEGES ON DATABASE ny_health_db TO health_admin;
    -- Grant schema privileges (required for Postgres 15+)
    \c ny_health_db
    GRANT ALL ON SCHEMA public TO health_admin;
    \q
    ```

---

## Phase 2: Environment Configuration
Prepare the application to connect to the new database.

1.  **Create/Update `.env`**:
    Copy the `env_example` provided in this directory to `.env` and update the `POSTGRES_URL`.
    ```env
    DB_TYPE=postgres
    POSTGRES_URL=postgresql://health_admin:your_secure_password@localhost:5432/ny_health_db
    ```

---

## Phase 3: Schema Initialization
The application is designed to create missing tables automatically on startup.

1.  **Initialize Tables**:
    Run the server in development mode once to trigger table creation in Postgres.
    ```bash
    bun run dev:server
    ```
    Wait for the log: `[info] Initializing Postgres Adapter`. Once the server is running, you can stop it (`Ctrl+C`).

2.  **Verify Tables**:
    Optionally, check if tables were created:
    ```bash
    psql -U health_admin -d ny_health_db -c "\dt"
    ```

---

## Phase 4: Data Migration
Use the built-in migration script to move your existing data from SQLite to Postgres.

1.  **Run Migration Script**:
    ```bash
    bun run migrate:postgres
    ```
    This script will:
    - Connect to both SQLite and Postgres.
    - Copy data for all tables (`vaccination_data`, `disease_stats`, `wastewater_data`, etc.).
    - Handle conflicts for unique fields like `alert_id`.

---

## Phase 5: Verification & Cleanup
1.  **Test the Dashboard**:
    Start the full application and ensure all charts and data points load correctly.
    ```bash
    bun run dev
    ```

2.  **Backup SQLite**:
    Once you're confident the migration was successful, move the old SQLite files to a backup directory.
    ```bash
    mkdir -p ./server/data/backups
    mv ./server/data/*.db ./server/data/backups/
    ```

---

## Troubleshooting
- **Connection Refused**: Ensure PostgreSQL is listening on port 5432 (`ss -nlt | grep 5432`).
- **Permission Denied**: Ensure the `health_admin` user has `CREATE` permissions on the `public` schema in the `ny_health_db`.
- **Duplicate Data**: If the migration script is run multiple times, it uses `ON CONFLICT DO NOTHING` for unique fields to prevent duplicates.
