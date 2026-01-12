import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '@/config/index';
import { logger } from '@/utils/logger';
import { database } from '@/config/database';

export interface CSVCacheEntry {
  url: string;
  filename: string;
  localPath: string;
  remoteLastModified?: string;
  remoteETag?: string;
  localFileHash: string;
  downloadCount: number;
  lastChecked: Date;
}

export interface CSVCacheResult {
  data: string;
  filename: string;
  fromCache: boolean;
  lastModified?: string;
}

export class CSVCacheService {
  private db = database;
  private cachePath = config.CSV_CACHE_PATH;

  constructor() {
    this.ensureCacheDirectory();
  }

  private async ensureCacheDirectory() {
    await fs.promises.mkdir(this.cachePath, { recursive: true });
  }

  private generateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private generateFilename(url: string): string {
    const urlHash = crypto.createHash('md5').update(url).digest('hex');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${urlHash}-${timestamp}.csv`;
  }

  private async getFromDatabase(url: string): Promise<CSVCacheEntry | null> {
    const row = await this.db.get<{
      url: string;
      filename: string;
      local_path: string;
      remote_last_modified: string;
      remote_etag: string;
      local_file_hash: string;
      download_count: number;
      last_checked: string;
    }>(`
      SELECT url, filename, local_path, remote_last_modified, remote_etag, 
             local_file_hash, download_count, last_checked
      FROM csv_cache 
      WHERE url = ?
    `, [url]);

    if (!row) return null;

    return {
      url: row.url,
      filename: row.filename,
      localPath: row.local_path,
      remoteLastModified: row.remote_last_modified || undefined,
      remoteETag: row.remote_etag || undefined,
      localFileHash: row.local_file_hash,
      downloadCount: row.download_count,
      lastChecked: new Date(row.last_checked)
    };
  }

  private async saveToDatabase(entry: Omit<CSVCacheEntry, 'lastChecked'>): Promise<void> {
    await this.db.run(`
      INSERT INTO csv_cache
      (url, filename, local_path, remote_last_modified, remote_etag, 
       local_file_hash, download_count, last_checked)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(url, remote_last_modified, remote_etag) DO UPDATE SET
        filename = excluded.filename,
        local_path = excluded.local_path,
        local_file_hash = excluded.local_file_hash,
        download_count = excluded.download_count,
        last_checked = CURRENT_TIMESTAMP
    `, [
      entry.url,
      entry.filename,
      entry.localPath,
      entry.remoteLastModified,
      entry.remoteETag,
      entry.localFileHash,
      entry.downloadCount
    ]);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async readFile(filePath: string): Promise<string> {
    return fs.promises.readFile(filePath, 'utf-8');
  }

  private async writeFile(filePath: string, content: string): Promise<void> {
    await fs.promises.writeFile(filePath, content, 'utf-8');
  }

  private async downloadWithHeaders(url: string, lastModified?: string, etag?: string): Promise<{
    content: string;
    lastModified?: string;
    etag?: string;
    status: number;
  }> {
    const headers: Record<string, string> = {};
    
    if (lastModified) {
      headers['If-Modified-Since'] = lastModified;
    }
    if (etag) {
      headers['If-None-Match'] = etag;
    }

    const response = await fetch(url, { headers });
    
    return {
      content: response.status === 304 ? '' : await response.text(),
      lastModified: response.headers.get('Last-Modified') || undefined,
      etag: response.headers.get('ETag') || undefined,
      status: response.status
    };
  }

  private validateFileIntegrity(filePath: string, expectedHash: string): boolean {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const actualHash = this.generateHash(content);
      return actualHash === expectedHash;
    } catch {
      return false;
    }
  }

  async getCachedCSV(url: string, forceDownload = false): Promise<CSVCacheResult> {
    if (forceDownload) {
      return this.downloadCSV(url);
    }

    const cachedEntry = await this.getFromDatabase(url);
    
    if (!cachedEntry) {
      logger.csvCacheMiss(url, 'No cache entry found');
      return this.downloadCSV(url);
    }

    const fileExists = await this.fileExists(cachedEntry.localPath);
    
    if (!fileExists) {
      logger.csvCacheMiss(url, 'Cached file not found');
      return this.downloadCSV(url);
    }

    const fileIntegrityValid = this.validateFileIntegrity(cachedEntry.localPath, cachedEntry.localFileHash);
    
    if (!fileIntegrityValid) {
      logger.csvCacheMiss(url, 'File integrity check failed');
      return this.downloadCSV(url);
    }

    try {
      const downloadResult = await this.downloadWithHeaders(url, cachedEntry.remoteLastModified, cachedEntry.remoteETag);
      
      if (downloadResult.status === 304) {
        logger.csvCacheHit(url, cachedEntry.remoteLastModified || 'unknown');
        
        await this.db.run('UPDATE csv_cache SET last_checked = CURRENT_TIMESTAMP WHERE url = ?', [url]);
        
        const content = await this.readFile(cachedEntry.localPath);
        
        return {
          data: content,
          filename: cachedEntry.filename,
          fromCache: true,
          lastModified: cachedEntry.remoteLastModified
        };
      }
      
      if (downloadResult.status >= 200 && downloadResult.status < 300) {
        logger.csvCacheMiss(url, `Remote content updated (HTTP ${downloadResult.status})`);
        return this.saveDownloadedCSV(url, downloadResult.content, downloadResult.lastModified, downloadResult.etag);
      }
      
      throw new Error(`HTTP ${downloadResult.status}: Failed to download CSV`);
      
    } catch (error) {
      logger.warn(`Failed to download updated CSV, using cached version`, { url, error: (error as Error).message });
      
      const content = await this.readFile(cachedEntry.localPath);
      return {
        data: content,
        filename: cachedEntry.filename,
        fromCache: true,
        lastModified: cachedEntry.remoteLastModified
      };
    }
  }

  private async downloadCSV(url: string): Promise<CSVCacheResult> {
    try {
      const downloadResult = await this.downloadWithHeaders(url);
      
      if (downloadResult.status >= 200 && downloadResult.status < 300) {
        return this.saveDownloadedCSV(url, downloadResult.content, downloadResult.lastModified, downloadResult.etag);
      }
      
      throw new Error(`HTTP ${downloadResult.status}: Failed to download CSV`);
      
    } catch (error) {
      logger.error(`Failed to download CSV`, { url, error: (error as Error).message });
      throw error;
    }
  }

  private async saveDownloadedCSV(url: string, content: string, lastModified?: string, etag?: string): Promise<CSVCacheResult> {
    const filename = this.generateFilename(url);
    const localPath = path.join(this.cachePath, filename);
    const fileHash = this.generateHash(content);
    
    await this.writeFile(localPath, content);
    
    const cacheEntry: Omit<CSVCacheEntry, 'lastChecked'> = {
      url,
      filename,
      localPath,
      remoteLastModified: lastModified,
      remoteETag: etag,
      localFileHash: fileHash,
      downloadCount: 1
    };
    
    await this.saveToDatabase(cacheEntry);
    
    logger.info('CSV downloaded and cached', { url, filename, lastModified, etag });
    
    return {
      data: content,
      filename,
      fromCache: false,
      lastModified
    };
  }

  async clearCache(): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.cachePath);
      await Promise.all(files.map(file => fs.promises.unlink(path.join(this.cachePath, file))));
      
      await this.db.run('DELETE FROM csv_cache');
      
      logger.info('CSV cache cleared');
    } catch (error) {
      logger.error('Failed to clear CSV cache', { error: (error as Error).message });
      throw error;
    }
  }

  async getCacheStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  }> {
    const statsResult = await this.db.get<{ count: number }>('SELECT COUNT(*) as count FROM csv_cache');
    const entries = await this.db.all<{ created_at: string }>('SELECT created_at FROM csv_cache ORDER BY created_at');
    
    let totalSize = 0;
    const files = await fs.promises.readdir(this.cachePath);
    for (const file of files) {
      const filePath = path.join(this.cachePath, file);
      try {
        const stats = await fs.promises.stat(filePath);
        totalSize += stats.size;
      } catch {
      }
    }
    
    const oldest = entries[0];
    const newest = entries[entries.length - 1];

    return {
      totalEntries: statsResult?.count || 0,
      totalSize,
      oldestEntry: oldest?.created_at ? new Date(oldest.created_at) : undefined,
      newestEntry: newest?.created_at ? new Date(newest.created_at) : undefined
    };
  }
}

export const csvCacheService = new CSVCacheService();