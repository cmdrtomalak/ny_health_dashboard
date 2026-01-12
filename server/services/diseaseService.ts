import { database } from '@/config/database';
import { logger } from '@/utils/logger';

const CDC_NNDSS_API = 'https://data.cdc.gov/resource/x9gk-5huc.json';

const TRACKED_DISEASES = [
  'Chikungunya virus disease',
  'Diphtheria',
  'Marburg virus disease',
  'Measles',
  'Mpox',
  'Influenza-associated pediatric mortality',
  'Novel Influenza A virus infections',
  'Pertussis',
  'Poliomyelitis, paralytic',
  'Rift Valley fever',
  'COVID-19'
];

interface NNDSSRecord {
  label: string;
  m1: string;
  states: string;
  year: string;
  week: string;
  location1?: string;
}

interface CovidData {
  case_count: string;
  probable_case_count: string;
  date_of_interest: string;
}

interface FluData {
  epidata?: Array<{ num_ili: number }>;
}

export interface DiseaseStats {
  name: string;
  currentCount: number;
  weekAgo: any;
  monthAgo: any;
  twoMonthsAgo: any;
  yearAgo: any;
  unit: string;
  lastUpdated: string;
  dataSource?: string;
  sourceUrl?: string;
  region?: string;
}

export class DiseaseService {
  private db = database;

  async syncData(): Promise<void> {
    try {
      await this.syncDiseaseStats();
      logger.syncComplete('disease', 'full_sync', 0, 0);
    } catch (error) {
      logger.syncError('disease', 'full_sync', error as Error);
      throw error;
    }
  }

  private async syncDiseaseStats() {
    try {
      const [nndssResponse, covidResponse, fluResponse] = await Promise.all([
        fetch(`${CDC_NNDSS_API}?$where=(location1='NEW YORK' OR location1='NEW YORK CITY')&$order=year DESC, week DESC&$limit=5000`),
        fetch(`https://data.cityofnewyork.us/resource/rc75-m7u3.json?$limit=5&$order=date_of_interest DESC`),
        fetch(`https://api.delphi.cmu.edu/epidata/fluview/?regions=hhs2&epiweeks=202501`)
      ]);

      const nndssData: NNDSSRecord[] = nndssResponse.ok ? await nndssResponse.json() as any : [];
      const covidData: CovidData[] = covidResponse.ok ? await covidResponse.json() as any : [];
      const fluData: FluData = fluResponse.ok ? await fluResponse.json() as any : {};

      let covidCount = 0;
      let covidDate = new Date().toISOString();
      if (covidData.length > 0) {
        const latest = covidData[0];
        if (latest) {
          covidCount = (parseInt(latest.case_count) || 0) + (parseInt(latest.probable_case_count) || 0);
          covidDate = latest.date_of_interest;
        }
      }

      let fluCount = 0;
      let fluDate = new Date().toISOString();
      if (fluData.epidata && fluData.epidata.length > 0) {
        const latestFlu = fluData.epidata[0];
        if (latestFlu) {
          fluCount = latestFlu.num_ili || 0;
          fluDate = new Date().toISOString();
        }
      }

      const diseaseMap = new Map<string, { current: number; yearAgo: number; source?: string; url?: string }>();

      TRACKED_DISEASES.forEach(d => diseaseMap.set(d, { current: 0, yearAgo: 0 }));

      if (covidCount > 0) {
        diseaseMap.set('COVID-19', {
          current: covidCount,
          yearAgo: 0,
          source: 'NYC Open Data',
          url: 'https://data.cityofnewyork.us/Health/COVID-19-Daily-Counts-of-Cases-Hospitalizations-/rc75-m7u3'
        });
      }

      if (fluCount > 0) {
        diseaseMap.set('Novl Influenza A virus infections', {
          current: fluCount,
          yearAgo: 0
        });
      }

      nndssData.forEach(record => {
        const loc = (record.location1 || '').toUpperCase();
        if (!loc.includes('NEW YORK')) return;

        const disease = TRACKED_DISEASES.find(d => record.label && (record.label.includes(d) || d.includes(record.label)));
        if (disease) {
          if (disease.includes('COVID') && covidCount > 0) return;

          let count = 0;
          if (record.m1 && record.m1 !== '-') {
            count = parseInt(record.m1);
          }

          if (!isNaN(count)) {
            const stats = diseaseMap.get(disease)!;
            stats.current += count;
            diseaseMap.set(disease, stats);
          }
        }
      });

      const stats: DiseaseStats[] = [];

      for (const [name, counts] of diseaseMap.entries()) {
        stats.push({
          name: name,
          currentCount: counts.current,
          weekAgo: { count: 0, trend: 'stable', percentChange: 0 },
          monthAgo: { count: 0, trend: 'stable', percentChange: 0 },
          twoMonthsAgo: { count: 0, trend: 'stable', percentChange: 0 },
          yearAgo: { count: counts.yearAgo, trend: 'stable', percentChange: 0 },
          unit: name.includes('COVID') ? 'cases (daily)' : (name.includes('Influenza') ? 'ILI visits (region)' : 'cases (YTD)'),
          lastUpdated: name.includes('COVID') ? covidDate : (name.includes('Influenza') ? fluDate : new Date().toISOString()),
          dataSource: counts.source || 'CDC NNDSS',
          sourceUrl: counts.url || 'https://data.cdc.gov/NNDSS/NNDSS-Weekly-Data/x9gk-5huc',
          region: 'nyc'
        });
      }

      if (fluCount > 0) {
        stats.push({
          name: 'Influenza (ILI)',
          currentCount: fluCount,
          weekAgo: { count: 0, trend: 'stable', percentChange: 0 },
          monthAgo: { count: 0, trend: 'stable', percentChange: 0 },
          twoMonthsAgo: { count: 0, trend: 'stable', percentChange: 0 },
          yearAgo: { count: 0, trend: 'stable', percentChange: 0 },
          unit: 'outpatient visits',
          lastUpdated: fluDate,
          dataSource: 'CDC ILINet (Delphi)',
          sourceUrl: 'https://github.com/cmu-delphi/delphi-epidata',
          region: 'nyc'
        });
      }

      await this.saveToDatabase(stats);

    } catch (error) {
      logger.error('Failed to sync disease stats', { error });
      throw error;
    }
  }

  private async saveToDatabase(stats: DiseaseStats[]) {
    await this.db.run('DELETE FROM disease_stats');

    for (const stat of stats) {
      await this.db.run(`
        INSERT INTO disease_stats (
          name, current_count, week_ago_count, month_ago_count,
          two_months_ago_count, year_ago_count, unit, last_updated,
          data_source, source_url, region, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        stat.name,
        stat.currentCount,
        stat.weekAgo.count,
        stat.monthAgo.count,
        stat.twoMonthsAgo.count,
        stat.yearAgo.count,
        stat.unit,
        stat.lastUpdated,
        stat.dataSource,
        stat.sourceUrl,
        stat.region || 'nyc'
      ]);
    }
  }

  async getData(region = 'nyc'): Promise<DiseaseStats[]> {
    const rows = await this.db.all<any>('SELECT * FROM disease_stats WHERE region = ?', [region]);
    
    return rows.map((row) => ({
      name: row.name,
      currentCount: row.current_count,
      weekAgo: { count: row.week_ago_count, trend: 'stable', percentChange: 0 },
      monthAgo: { count: row.month_ago_count, trend: 'stable', percentChange: 0 },
      twoMonthsAgo: { count: row.two_months_ago_count, trend: 'stable', percentChange: 0 },
      yearAgo: { count: row.year_ago_count, trend: 'stable', percentChange: 0 },
      unit: row.unit,
      lastUpdated: row.last_updated,
      dataSource: row.data_source,
      sourceUrl: row.source_url,
      region: row.region
    }));
  }
}

export const diseaseService = new DiseaseService();