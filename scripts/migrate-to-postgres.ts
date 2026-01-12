import { SqliteAdapter } from '../server/database/sqlite';
import { PostgresAdapter } from '../server/database/postgres';
import { config } from '../server/config/index';

async function migrate() {
  if (!config.POSTGRES_URL) {
    console.error('POSTGRES_URL is not defined in .env');
    process.exit(1);
  }

  console.log('Connecting to databases...');
  const sqlite = new SqliteAdapter();
  await sqlite.ready;
  const postgres = new PostgresAdapter(config.POSTGRES_URL);
  await postgres.ready;

  console.log('Starting migration...');

  try {
    // 1. vaccination_data
    console.log('Migrating vaccination_data...');
    const vaccinations = await sqlite.all('SELECT * FROM vaccination_data');
    for (const v of vaccinations) {
      await postgres.run(`
        INSERT INTO vaccination_data
        (region, vaccine_name, current_year, five_years_ago, ten_years_ago,
         last_available_rate, last_available_date, collection_method,
         source_url, calculation_details, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        v.region, v.vaccine_name, v.current_year, v.five_years_ago, v.ten_years_ago,
        v.last_available_rate, v.last_available_date, v.collection_method,
        v.source_url, v.calculation_details, v.created_at, v.updated_at
      ]);
    }

    // 2. disease_stats
    console.log('Migrating disease_stats...');
    const diseases = await sqlite.all('SELECT * FROM disease_stats');
    for (const d of diseases) {
      await postgres.run(`
        INSERT INTO disease_stats
        (name, current_count, week_ago_count, month_ago_count, two_months_ago_count,
         year_ago_count, unit, last_updated, data_source, source_url, region,
         created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        d.name, d.current_count, d.week_ago_count, d.month_ago_count, d.two_months_ago_count,
        d.year_ago_count, d.unit, d.last_updated, d.data_source, d.source_url, d.region,
        d.created_at, d.updated_at
      ]);
    }

    // 3. wastewater_data
    console.log('Migrating wastewater_data...');
    const wastewater = await sqlite.all('SELECT * FROM wastewater_data');
    for (const w of wastewater) {
      await postgres.run(`
        INSERT INTO wastewater_data
        (sample_date, location, concentration, trend, pathogen, average_concentration,
         alert_level, last_updated, pathogens, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        w.sample_date, w.location, w.concentration, w.trend, w.pathogen, w.average_concentration,
        w.alert_level, w.last_updated, w.pathogens, w.created_at, w.updated_at
      ]);
    }

    // 4. news_data
    console.log('Migrating news_data...');
    const news = await sqlite.all('SELECT * FROM news_data');
    for (const n of news) {
      await postgres.run(`
        INSERT INTO news_data
        (alert_id, title, summary, date, severity, source, url, region,
         created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (alert_id) DO NOTHING
      `, [
        n.alert_id, n.title, n.summary, n.date, n.severity, n.source, n.url, n.region,
        n.created_at, n.updated_at
      ]);
    }

    // 5. csv_cache
    console.log('Migrating csv_cache...');
    const csvCache = await sqlite.all('SELECT * FROM csv_cache');
    for (const c of csvCache) {
      await postgres.run(`
        INSERT INTO csv_cache
        (url, filename, local_path, remote_last_modified, remote_etag,
         local_file_hash, download_count, last_checked, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (url, remote_last_modified, remote_etag) DO NOTHING
      `, [
        c.url, c.filename, c.local_path, c.remote_last_modified, c.remote_etag,
        c.local_file_hash, c.download_count, c.last_checked, c.created_at
      ]);
    }

    // 6. sync_log
    console.log('Migrating sync_log...');
    const syncLogs = await sqlite.all('SELECT * FROM sync_log');
    for (const s of syncLogs) {
      await postgres.run(`
        INSERT INTO sync_log
        (sync_type, data_source, status, records_processed, error_message,
         duration_ms, triggered_by, source_ip, user_id, was_rate_limited,
         scheduled_at, started_at, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        s.sync_type, s.data_source, s.status, s.records_processed, s.error_message,
        s.duration_ms, s.triggered_by, s.source_ip, s.user_id, s.was_rate_limited,
        s.scheduled_at, s.started_at, s.completed_at
      ]);
    }

    // 7. manual_refresh_requests
    console.log('Migrating manual_refresh_requests...');
    const manualRequests = await sqlite.all('SELECT * FROM manual_refresh_requests');
    for (const m of manualRequests) {
      await postgres.run(`
        INSERT INTO manual_refresh_requests
        (request_id, source_ip, user_id, request_time, scheduled_for,
         executed, notification_sent, websocket_connection_id, request_data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (request_id) DO NOTHING
      `, [
        m.request_id, m.source_ip, m.user_id, m.request_time, m.scheduled_for,
        m.executed, m.notification_sent, m.websocket_connection_id, m.request_data, m.created_at
      ]);
    }

    // 8. rate_limit_tracking
    console.log('Migrating rate_limit_tracking...');
    const rateLimits = await sqlite.all('SELECT * FROM rate_limit_tracking');
    for (const r of rateLimits) {
      await postgres.run(`
        INSERT INTO rate_limit_tracking
        (hour_window, request_count, source_ip, last_request_time)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (hour_window, source_ip) DO NOTHING
      `, [
        r.hour_window, r.request_count, r.source_ip, r.last_request_time
      ]);
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sqlite.close();
    await postgres.close();
  }
}

migrate();
