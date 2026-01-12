import sqlite3 from 'sqlite3';
import fs from 'fs/promises';
import path from 'path';
import { config } from '@/config/index';
import { DatabaseAdapter } from './types';

export class SqliteAdapter implements DatabaseAdapter {
  private db: sqlite3.Database;
  public ready: Promise<void>;

  constructor() {
    this.db = new sqlite3.Database(config.DATABASE_PATH);
    this.ready = this.initializeDatabase();
  }

  private async initializeDatabase() {
    await this.ensureDataDirectory();
    await this.createTables();
  }

  private async ensureDataDirectory() {
    const dbDir = path.dirname(config.DATABASE_PATH);
    const csvCacheDir = config.CSV_CACHE_PATH;

    await fs.mkdir(dbDir, { recursive: true });
    await fs.mkdir(csvCacheDir, { recursive: true });
  }

  private async createTables() {
    await this.run(`
      CREATE TABLE IF NOT EXISTS dashboard_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data_json TEXT NOT NULL,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        is_stale BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS csv_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT UNIQUE NOT NULL,
        filename TEXT NOT NULL,
        local_path TEXT NOT NULL,
        remote_last_modified TEXT,
        remote_etag TEXT,
        local_file_hash TEXT,
        download_count INTEGER DEFAULT 1,
        last_checked DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(url, remote_last_modified, remote_etag)
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        scheduled_at DATETIME,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS manual_refresh_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id TEXT UNIQUE NOT NULL,
        source_ip TEXT NOT NULL,
        user_id TEXT,
        request_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        scheduled_for DATETIME,
        executed BOOLEAN DEFAULT FALSE,
        notification_sent BOOLEAN DEFAULT FALSE,
        websocket_connection_id TEXT,
        request_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS rate_limit_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hour_window DATETIME NOT NULL,
        request_count INTEGER DEFAULT 1,
        source_ip TEXT NOT NULL,
        last_request_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(hour_window, source_ip)
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS vaccination_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS disease_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS wastewater_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sample_date TEXT,
        location TEXT,
        concentration REAL,
        trend TEXT,
        pathogen TEXT,
        average_concentration REAL,
        alert_level TEXT,
        last_updated TEXT,
        pathogens TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS news_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alert_id TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        summary TEXT,
        date TEXT,
        severity TEXT,
        source TEXT,
        url TEXT,
        region TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
      'CREATE INDEX IF NOT EXISTS idx_wastewater_sample_date ON wastewater_data(sample_date)',
      'CREATE INDEX IF NOT EXISTS idx_news_data_region ON news_data(region)'
    ];

    for (const indexSql of indexes) {
      await this.run(indexSql);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T);
      });
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  async close() {
    return new Promise<void>((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
