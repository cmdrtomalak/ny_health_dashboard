import { database } from '@/config/database';
import { logger } from '@/utils/logger';
import * as cheerio from 'cheerio';

const CDC_RSS_FEED = 'https://tools.cdc.gov/api/v2/resources/media/132608.rss';
const NYC_NEWS_URL = 'https://www.nyc.gov/site/doh/about/press/recent-press-releases.page';
const NYS_NEWS_URL = 'https://info.nystateofhealth.ny.gov/news';

export interface NewsAlert {
  id: string;
  title: string;
  summary: string;
  date: string;
  severity: string;
  source: string;
  url?: string;
  region?: string;
}

export interface NewsData {
  nyc: NewsAlert[];
  nys: NewsAlert[];
  usa: NewsAlert[];
  lastUpdated: string;
}

export class NewsService {
  private db = database;

  async syncData(): Promise<void> {
    try {
      const [nycNews, nysNews, cdcNews] = await Promise.all([
        this.fetchNYCNews(),
        this.fetchNYSNews(),
        this.fetchCDCNews()
      ]);

      await this.saveToDatabase([...nycNews, ...nysNews, ...cdcNews]);
      logger.syncComplete('news', 'full_sync', 0, 0);
    } catch (error) {
      logger.syncError('news', 'full_sync', error as Error);
      throw error;
    }
  }

  private async fetchNYCNews(): Promise<NewsAlert[]> {
    try {
      const response = await fetch(NYC_NEWS_URL);
      if (!response.ok) throw new Error('Failed to fetch NYC news');
      const text = await response.text();
      const $ = cheerio.load(text);
      const alerts: NewsAlert[] = [];

      $('p').each((_, element) => {
        if (alerts.length >= 5) return;

        const strong = $(element).find('strong');
        const link = $(element).find('a');

        if (strong.length && link.length && link.attr('href')) {
          const dateText = strong.text().trim();
          const title = link.text().trim();
          let href = link.attr('href') || '';
          
          if (href.startsWith('/')) {
            href = `https://www.nyc.gov${href}`;
          }

          if (dateText && title) {
            alerts.push({
              id: `nyc-${Math.random().toString(36).substr(2, 9)}`,
              title,
              summary: 'Press Release via NYC Health',
              date: dateText,
              severity: 'info',
              source: 'NYC Department of Health',
              url: href,
              region: 'nyc'
            });
          }
        }
      });

      return alerts;
    } catch (error) {
      logger.warn('Failed to scrape NYC news', { error });
      return [];
    }
  }

  private async fetchNYSNews(): Promise<NewsAlert[]> {
    try {
      const response = await fetch(NYS_NEWS_URL);
      if (!response.ok) throw new Error('Failed to fetch NYS news');
      const text = await response.text();
      const $ = cheerio.load(text);
      const alerts: NewsAlert[] = [];

      $('article.node--type-news').each((_, element) => {
        if (alerts.length >= 5) return;

        const link = $(element).find('h2.node__title a');
        const dateElem = $(element).find('.field--name-field-publication-date time');

        if (link.length) {
          const title = link.text().trim();
          let href = link.attr('href') || '';
          
          if (href.startsWith('/')) {
            href = `https://info.nystateofhealth.ny.gov${href}`;
          }
          
          const dateText = dateElem.text().trim() || new Date().toLocaleDateString();

          alerts.push({
            id: `nys-${Math.random().toString(36).substr(2, 9)}`,
            title,
            summary: 'News & Events via NY State of Health',
            date: dateText,
            severity: 'info',
            source: 'NY State of Health',
            url: href,
            region: 'nys'
          });
        }
      });

      return alerts;
    } catch (error) {
      logger.warn('Failed to scrape NYS news', { error });
      return [];
    }
  }

  private async fetchCDCNews(): Promise<NewsAlert[]> {
    try {
      const response = await fetch(CDC_RSS_FEED);
      const text = await response.text();
      const $ = cheerio.load(text, { xmlMode: true });
      const alerts: NewsAlert[] = [];

      $('item').each((index, element) => {
        if (index >= 5) return;

        alerts.push({
          id: `cdc-${index}`,
          title: $(element).find('title').text() || "Unknown Alert",
          summary: $(element).find('description').text() || "",
          date: $(element).find('pubDate').text() || new Date().toISOString(),
          severity: 'info',
          source: 'CDC Health Alert Network',
          url: $(element).find('link').text() || "",
          region: 'usa'
        });
      });

      return alerts;
    } catch (error) {
      logger.warn('CDC News fetch failed', { error });
      return [];
    }
  }

  private async saveToDatabase(alerts: NewsAlert[]) {
    await this.db.run('DELETE FROM news_data');

    for (const alert of alerts) {
      await this.db.run(`
        INSERT INTO news_data (
          alert_id, title, summary, date, severity, source, url, region,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        alert.id,
        alert.title,
        alert.summary,
        alert.date,
        alert.severity,
        alert.source,
        alert.url,
        alert.region
      ]);
    }
  }

  async getData(): Promise<NewsData> {
    const rows = await this.db.all<any>('SELECT * FROM news_data ORDER BY date DESC');
    
    const nyc: NewsAlert[] = [];
    const nys: NewsAlert[] = [];
    const usa: NewsAlert[] = [];

    for (const row of rows) {
      const alert: NewsAlert = {
        id: row.alert_id,
        title: row.title,
        summary: row.summary,
        date: row.date,
        severity: row.severity as any,
        source: row.source,
        url: row.url,
        region: row.region
      };

      if (row.region === 'nyc') nyc.push(alert);
      else if (row.region === 'nys') nys.push(alert);
      else if (row.region === 'usa') usa.push(alert);
    }

    return {
      nyc,
      nys,
      usa,
      lastUpdated: new Date().toISOString()
    };
  }
}

export const newsService = new NewsService();