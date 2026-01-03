import fs from 'fs/promises';
import path from 'path';
import { config } from '@/config/index';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export class Logger {
  private logDir: string;
  private logLevel: LogLevel;
  private logLevelPriority: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
  };

  constructor() {
    this.logDir = config.LOG_DIR;
    this.logLevel = config.LOG_LEVEL;
    this.ensureLogDirectory();
  }

  private async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.logLevelPriority[level] <= this.logLevelPriority[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }

  private async writeLog(level: LogLevel, message: string, meta?: any) {
    if (!this.shouldLog(level)) return;

    const logMessage = this.formatMessage(level, message, meta);
    const logFile = path.join(this.logDir, `${level}.log`);

    try {
      await fs.appendFile(logFile, logMessage + '\n');
    } catch (error) {
      console.error(`Failed to write to log file ${logFile}:`, error);
    }

    if (config.NODE_ENV === 'development') {
      console.log(logMessage);
    }
  }

  error(message: string, meta?: any) {
    this.writeLog('error', message, meta);
  }

  warn(message: string, meta?: any) {
    this.writeLog('warn', message, meta);
  }

  info(message: string, meta?: any) {
    this.writeLog('info', message, meta);
  }

  debug(message: string, meta?: any) {
    this.writeLog('debug', message, meta);
  }
  syncStart(dataSource: string, type: string, triggeredBy?: string) {
    this.info('Sync started', {
      event: 'sync_start',
      dataSource,
      type,
      triggeredBy
    });
  }

  syncComplete(dataSource: string, type: string, duration: number, recordsProcessed: number) {
    this.info('Sync completed', {
      event: 'sync_complete',
      dataSource,
      type,
      duration,
      recordsProcessed
    });
  }

  syncError(dataSource: string, type: string, error: Error) {
    this.error('Sync failed', {
      event: 'sync_error',
      dataSource,
      type,
      error: error.message,
      stack: error.stack
    });
  }

  apiRequest(method: string, path: string, ip: string, userAgent?: string) {
    this.info('API request', {
      event: 'api_request',
      method,
      path,
      ip,
      userAgent
    });
  }

  rateLimitExceeded(ip: string, requestId: string) {
    this.warn('Rate limit exceeded', {
      event: 'rate_limit_exceeded',
      ip,
      requestId
    });
  }

  csvCacheHit(url: string, lastModified: string) {
    this.debug('CSV cache hit', {
      event: 'csv_cache_hit',
      url,
      lastModified
    });
  }

  csvCacheMiss(url: string, reason: string) {
    this.info('CSV cache miss', {
      event: 'csv_cache_miss',
      url,
      reason
    });
  }
}

export const logger = new Logger();