import pg from 'pg';
import { DatabaseAdapter } from './types';

const { Pool } = pg;

export class PostgresAdapter implements DatabaseAdapter {
  private pool: pg.Pool;
  public ready: Promise<void>;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
    });
    this.ready = this.initializeDatabase();
  }

  private async initializeDatabase() {
    await this.createTables();
  }

  private async createTables() {
    // Note: Replaced AUTOINCREMENT with SERIAL and DATETIME with TIMESTAMP

    await this.run(`
      CREATE TABLE IF NOT EXISTS dashboard_cache (
        id SERIAL PRIMARY KEY,
        data_json TEXT NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        is_stale BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS csv_cache (
        id SERIAL PRIMARY KEY,
        url TEXT UNIQUE NOT NULL,
        filename TEXT NOT NULL,
        local_path TEXT NOT NULL,
        remote_last_modified TEXT,
        remote_etag TEXT,
        local_file_hash TEXT,
        download_count INTEGER DEFAULT 1,
        last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(url, remote_last_modified, remote_etag)
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS sync_log (
        id SERIAL PRIMARY KEY,
        sync_type TEXT NOT NULL,
        data_source TEXT,
        status TEXT NOT NULL,
        records_processed INTEGER DEFAULT 0,
        error_message TEXT,
        duration_ms INTEGER,
        triggered_by TEXT,
        source_ip TEXT,
        user_id TEXT,
        was_rate_limited BOOLEAN DEFAULT FALSE,
        scheduled_at TIMESTAMP,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS manual_refresh_requests (
        id SERIAL PRIMARY KEY,
        request_id TEXT UNIQUE NOT NULL,
        source_ip TEXT NOT NULL,
        user_id TEXT,
        request_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        scheduled_for TIMESTAMP,
        executed BOOLEAN DEFAULT FALSE,
        notification_sent BOOLEAN DEFAULT FALSE,
        websocket_connection_id TEXT,
        request_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS rate_limit_tracking (
        id SERIAL PRIMARY KEY,
        hour_window TIMESTAMP NOT NULL,
        request_count INTEGER DEFAULT 1,
        source_ip TEXT NOT NULL,
        last_request_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(hour_window, source_ip)
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS vaccination_data (
        id SERIAL PRIMARY KEY,
        region TEXT NOT NULL,
        vaccine_name TEXT NOT NULL,
        current_year REAL,
        five_years_ago REAL,
        ten_years_ago REAL,
        last_available_rate REAL,
        last_available_date TEXT,
        collection_method TEXT,
        source_url TEXT,
        calculation_details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS disease_stats (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        current_count INTEGER,
        week_ago_count INTEGER,
        month_ago_count INTEGER,
        two_months_ago_count INTEGER,
        year_ago_count INTEGER,
        unit TEXT,
        last_updated TEXT,
        data_source TEXT,
        source_url TEXT,
        region TEXT DEFAULT 'nyc',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);



    await this.run(`
      CREATE TABLE IF NOT EXISTS news_data (
        id SERIAL PRIMARY KEY,
        alert_id TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        summary TEXT,
        date TEXT,
        severity TEXT,
        source TEXT,
        url TEXT,
        region TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_dashboard_cache_last_updated ON dashboard_cache(last_updated)',
      'CREATE INDEX IF NOT EXISTS idx_csv_cache_url ON csv_cache(url)',
      'CREATE INDEX IF NOT EXISTS idx_sync_log_started_at ON sync_log(started_at)',
      'CREATE INDEX IF NOT EXISTS idx_manual_refresh_request_time ON manual_refresh_requests(request_time)',
      'CREATE INDEX IF NOT EXISTS idx_rate_limit_hour_window ON rate_limit_tracking(hour_window, source_ip)',
      'CREATE INDEX IF NOT EXISTS idx_vaccination_data_region ON vaccination_data(region)',
      'CREATE INDEX IF NOT EXISTS idx_disease_stats_region ON disease_stats(region)',

      'CREATE INDEX IF NOT EXISTS idx_news_data_region ON news_data(region)'
    ];

    for (const indexSql of indexes) {
      await this.run(indexSql);
    }
  }

  // Helper to convert SQLite ? placeholders to Postgres $n placeholders
  private convertSql(sql: string): string {
    let paramIndex = 1;
    // Replace ? with $1, $2, etc.
    // We assume ? is not inside quotes, which is risky but standard for simple queries.
    return sql.replace(/\?/g, () => `$${paramIndex++}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async run(sql: string, params: any[] = []): Promise<void> {
    const convertedSql = this.convertSql(sql);
    try {
      await this.pool.query(convertedSql, params);
    } catch (error) {
      console.error('Error running query:', convertedSql, params, error);
      throw error;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const convertedSql = this.convertSql(sql);
    const res = await this.pool.query(convertedSql, params);
    return res.rows[0] as T;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const convertedSql = this.convertSql(sql);
    const res = await this.pool.query(convertedSql, params);
    return res.rows as T[];
  }

  async close() {
    await this.pool.end();
  }
}
