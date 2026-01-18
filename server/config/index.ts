import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Determine environment first for conditional defaults
const nodeEnv = process.env.NODE_ENV || 'production';


const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  // Changed default production port to 3190
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default(3190),
  TZ: z.string().default('America/New_York'),

  // Database Configuration
  DB_TYPE: z.enum(['sqlite', 'postgres']).default('sqlite'),
  POSTGRES_URL: z.string().optional(),
  DATABASE_PATH: z.string().default('./server/data/health_dashboard.db'),
  CSV_CACHE_PATH: z.string().default('./server/data/csv_cache'),

  SYNC_SCHEDULE_TIME: z.string().default('10:00'),
  SYNC_RETRY_ATTEMPTS: z.string().transform(Number).pipe(z.number().min(0).max(10)).default(3),
  SYNC_TIMEOUT: z.string().transform(Number).pipe(z.number().min(5000).max(300000)).default(30000),

  MANUAL_REFRESH_MAX_PER_HOUR: z.string().transform(Number).pipe(z.number().min(1).max(20)).default(3),
  RATE_LIMIT_WINDOW_MINUTES: z.string().transform(Number).pipe(z.number().min(30).max(1440)).default(60),
  ADMIN_BYPASS_RATE_LIMIT: z.string().transform(val => val.toLowerCase() === 'true').default(true),
  BUFFER_IMMEDIATE_FIRST_REQUEST: z.string().transform(val => val.toLowerCase() === 'true').default(true),
  BURST_PROTECTION_ENABLED: z.string().transform(val => val.toLowerCase() === 'true').default(true),

  CACHE_TTL_HOURS: z.string().transform(Number).pipe(z.number().min(1).max(168)).default(24),
  CSV_CACHE_MAX_SIZE_MB: z.string().transform(Number).pipe(z.number().min(10).max(5000)).default(500),

  WS_HEARTBEAT_INTERVAL: z.string().transform(Number).pipe(z.number().min(5000).max(300000)).default(30000),
  WS_MAX_CONNECTIONS: z.string().transform(Number).pipe(z.number().min(10).max(1000)).default(100),

  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_DIR: z.string().default('./server/logs'),
});

export const config = envSchema.parse(process.env);

export type Config = z.infer<typeof envSchema>;
