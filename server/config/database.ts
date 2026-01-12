import { config } from '@/config/index';
import { DatabaseAdapter } from '@/database/types';
import { SqliteAdapter } from '@/database/sqlite';
import { PostgresAdapter } from '@/database/postgres';
import { logger } from '@/utils/logger';

let database: DatabaseAdapter;

if (config.DB_TYPE === 'postgres' && config.POSTGRES_URL) {
  logger.info('Initializing Postgres Adapter');
  database = new PostgresAdapter(config.POSTGRES_URL);
} else {
  logger.info('Initializing SQLite Adapter');
  database = new SqliteAdapter();
}

export { database };
