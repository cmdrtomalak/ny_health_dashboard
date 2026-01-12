import { database } from '@/config/database';
import { logger } from '@/utils/logger';

const NYC_WASTEWATER_API = 'https://health.data.ny.gov/resource/hdxs-icuh.json';

interface NYCWastewaterRecord {
  samplecollectdate: string;
  wwtpname: string;
  pcrtargetavgconc: string;
  pcrtarget: string;
  county: string;
}

export interface WastewaterSample {
  date: string;
  location: string;
  concentration: number;
  trend: string;
  pathogen?: string;
}

export interface WastewaterData {
  samples: WastewaterSample[];
  averageConcentration: number;
  trend: string;
  alertLevel: 'low' | 'moderate' | 'high' | 'critical';
  lastUpdated: string;
  pathogens?: string[];
}

export class WastewaterService {
  private db = database;

  async syncData(): Promise<void> {
    try {
      await this.syncWastewaterData();
      logger.syncComplete('wastewater', 'full_sync', 0, 0);
    } catch (error) {
      logger.syncError('wastewater', 'full_sync', error as Error);
      throw error;
    }
  }

  private async syncWastewaterData() {
    try {
      const response = await fetch(
        `${NYC_WASTEWATER_API}?$order=samplecollectdate DESC&$limit=1000`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch wastewater data');
      }

      const rawData: NYCWastewaterRecord[] = await response.json() as any;

      const samples = rawData.map(r => ({
        date: (r.samplecollectdate || '').split('T')[0] || '',
        location: r.wwtpname,
        concentration: parseFloat(r.pcrtargetavgconc) || 0,
        trend: 'stable',
        pathogen: r.pcrtarget || 'SARS-CoV-2'
      })).filter(s => !isNaN(s.concentration));

      await this.saveToDatabase(samples);

    } catch (error) {
      logger.error('Failed to sync wastewater data', { error });
      throw error;
    }
  }

  private async saveToDatabase(samples: WastewaterSample[]) {
    await this.db.run('DELETE FROM wastewater_data');

    const avg = samples.reduce((acc, curr) => acc + curr.concentration, 0) / (samples.length || 1);
    const alertLevel = avg > 1000 ? 'high' : 'low';
    const lastUpdated = new Date().toISOString();
    const pathogens = JSON.stringify(['SARS-CoV-2']);

    for (const sample of samples) {
      await this.db.run(`
        INSERT INTO wastewater_data (
          sample_date, location, concentration, trend, pathogen,
          average_concentration, alert_level, last_updated, pathogens,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        sample.date,
        sample.location,
        sample.concentration,
        sample.trend,
        sample.pathogen,
        avg,
        alertLevel,
        lastUpdated,
        pathogens
      ]);
    }
  }

  async getData(): Promise<WastewaterData> {
    const rows = await this.db.all<any>('SELECT * FROM wastewater_data ORDER BY sample_date DESC');
    
    if (rows.length === 0) {
      return {
        samples: [],
        averageConcentration: 0,
        trend: 'stable',
        alertLevel: 'low',
        lastUpdated: new Date().toISOString(),
        pathogens: []
      };
    }

    const firstRow = rows[0];
    
    const samples = rows.map((row) => ({
      date: row.sample_date,
      location: row.location,
      concentration: row.concentration,
      trend: row.trend,
      pathogen: row.pathogen
    })).reverse();

    return {
      samples,
      averageConcentration: firstRow.average_concentration,
      trend: firstRow.trend,
      alertLevel: firstRow.alert_level as any,
      lastUpdated: firstRow.last_updated,
      pathogens: JSON.parse(firstRow.pathogens || '[]')
    };
  }
}

export const wastewaterService = new WastewaterService();