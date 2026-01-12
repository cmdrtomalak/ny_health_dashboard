import cron from 'node-cron';
import { config } from '@/config/index';
import { logger } from '@/utils/logger';
import { database } from '@/config/database';
import { vaccinationService } from './vaccinationService';
import { diseaseService } from './diseaseService';
import { wastewaterService } from './wastewaterService';
import { newsService } from './newsService';

interface SyncResult {
  success: boolean;
  errors: string[];
}

export class SyncService {
  private db = database;
  private isSyncing = false;

  constructor() { }

  async initialize() {
    this.scheduleDailySync();
    await this.checkBufferedRequests();
  }

  private scheduleDailySync() {
    const [hour, minute] = config.SYNC_SCHEDULE_TIME.split(':');
    const cronExpression = `${minute} ${hour} * * *`;
    cron.schedule(cronExpression, async () => {
      logger.info('Starting scheduled daily sync');
      await this.runFullSync('scheduled');
    }, {
      timezone: config.TZ
    });
  }

  async runFullSync(triggerType: 'scheduled' | 'manual' | 'buffered', triggeredBy?: string): Promise<SyncResult> {
    if (this.isSyncing) {
      logger.warn('Sync already in progress, skipping');
      return { success: false, errors: ['Sync in progress'] };
    }

    this.isSyncing = true;
    const startTime = Date.now();
    const errors: string[] = [];

    logger.syncStart('all', triggerType, triggeredBy);

    try {
      await this.logSyncStart(triggerType, triggeredBy);

      const results = await Promise.allSettled([
        vaccinationService.syncData().catch(e => { throw new Error(`Vaccination: ${e.message}`) }),
        diseaseService.syncData().catch(e => { throw new Error(`Disease: ${e.message}`) }),
        wastewaterService.syncData().catch(e => { throw new Error(`Wastewater: ${e.message}`) }),
        newsService.syncData().catch(e => { throw new Error(`News: ${e.message}`) })
      ]);

      results.forEach((result) => {
        if (result.status === 'rejected') {
          errors.push(result.reason.message);
        }
      });

      const success = errors.length === 0;
      const duration = Date.now() - startTime;

      await this.logSyncComplete(triggerType, success, errors.join('; '), duration);
      logger.syncComplete('all', triggerType, duration, 4 - errors.length);

      return { success, errors };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = (error as Error).message;
      await this.logSyncComplete(triggerType, false, errorMessage, duration);
      logger.syncError('all', triggerType, error as Error);
      return { success: false, errors: [errorMessage] };
    } finally {
      this.isSyncing = false;
    }
  }

  private async logSyncStart(type: string, triggeredBy?: string) {
    await this.db.run(`
      INSERT INTO sync_log (sync_type, status, triggered_by, started_at)
      VALUES (?, 'running', ?, CURRENT_TIMESTAMP)
    `, [type, triggeredBy || 'system']);
  }

  private async logSyncComplete(type: string, success: boolean, errorMessage: string, duration: number) {
    await this.db.run(`
      UPDATE sync_log 
      SET status = ?, error_message = ?, duration_ms = ?, completed_at = CURRENT_TIMESTAMP
      WHERE id = (SELECT MAX(id) FROM sync_log WHERE status = 'running')
    `, [success ? 'success' : 'failed', errorMessage, duration]);
  }

  async requestManualRefresh(ip: string, isAdmin = false): Promise<{
    status: 'scheduled' | 'buffered' | 'rejected';
    scheduledTime?: Date;
    message: string;
  }> {
    if (isAdmin && config.ADMIN_BYPASS_RATE_LIMIT) {
      this.runFullSync('manual', `admin:${ip}`);
      return { status: 'scheduled', message: 'Admin refresh started immediately' };
    }

    const canRunImmediately = await this.checkRateLimit(ip);

    if (canRunImmediately) {
      await this.trackRequest(ip);
      this.runFullSync('manual', `user:${ip}`);
      return { status: 'scheduled', message: 'Refresh started' };
    }

    const bufferResult = await this.bufferRequest(ip);
    if (bufferResult.buffered) {
      return {
        status: 'buffered',
        scheduledTime: bufferResult.scheduledTime,
        message: 'Rate limit exceeded. Request buffered for next hour.'
      };
    }

    return {
      status: 'rejected',
      message: 'Rate limit exceeded and buffer full. Please try again later.'
    };
  }

  private async checkRateLimit(ip: string): Promise<boolean> {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const hourWindow = now.toISOString();

    const row = await this.db.get<{ request_count: number }>(`
      SELECT request_count FROM rate_limit_tracking 
      WHERE hour_window = ? AND source_ip = ?
    `, [hourWindow, ip]);

    const count = row ? row.request_count : 0;

    if (count < config.MANUAL_REFRESH_MAX_PER_HOUR) {
      return true;
    }

    if (config.BUFFER_IMMEDIATE_FIRST_REQUEST && count === 0) {
      return true;
    }

    return false;
  }

  private async trackRequest(ip: string) {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const hourWindow = now.toISOString();

    await this.db.run(`
      INSERT INTO rate_limit_tracking (hour_window, source_ip, request_count)
      VALUES (?, ?, 1)
      ON CONFLICT(hour_window, source_ip) 
      DO UPDATE SET request_count = request_count + 1, last_request_time = CURRENT_TIMESTAMP
    `, [hourWindow, ip]);
  }

  private async bufferRequest(ip: string): Promise<{ buffered: boolean; scheduledTime?: Date }> {
    const existing = await this.db.get<{ id: number }>(`
      SELECT id FROM manual_refresh_requests 
      WHERE source_ip = ? AND executed = FALSE
    `, [ip]);

    if (existing) {
      return { buffered: false };
    }

    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);

    try {
      await this.db.run(`
        INSERT INTO manual_refresh_requests (
          request_id, source_ip, scheduled_for, executed
        ) VALUES (?, ?, ?, FALSE)
      `, [`req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, ip, nextHour.toISOString()]);

      return { buffered: true, scheduledTime: nextHour };
    } catch (e) {
      logger.error('Failed to buffer request', { error: e });
      return { buffered: false };
    }
  }

  private async checkBufferedRequests() {
    const pending = await this.db.all<{ id: number }>(`
      SELECT * FROM manual_refresh_requests 
      WHERE executed = FALSE AND scheduled_for <= CURRENT_TIMESTAMP
    `);

    if (pending && pending.length > 0) {
      logger.info(`Processing ${pending.length} buffered refresh requests`);

      await this.runFullSync('buffered', 'system:buffer_processor');

      for (const req of pending) {
        await this.db.run(`
          UPDATE manual_refresh_requests 
          SET executed = TRUE, notification_sent = TRUE 
          WHERE id = ?
        `, [req.id]);
      }
    }
  }
}

export const syncService = new SyncService();