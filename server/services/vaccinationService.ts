import { database } from '@/config/database';
import { csvCacheService } from './csvCacheService';
import { logger } from '@/utils/logger';
import Papa from 'papaparse';

const NYS_VAX_API = 'https://health.data.ny.gov/resource/xrhr-cy84.json';
const CHILDHOOD_DATA_URL = 'https://raw.githubusercontent.com/nychealth/immunization-data/main/demo/Main_Routine_Vaccine_Demo.csv';

interface ChildhoodVaccineRaw {
  VACCINE_GROUP: string;
  YEAR_COVERAGE: string;
  QUARTER?: string;
  COUNT_PEOPLE_VAC: string | number;
  POP_DENOMINATOR: string | number;
  PERC_VAC: string | number;
}

interface NYSVaxRecord {
  geography_description: string;
  geography_level: string;
  week_ending: string;
  respiratory_season: string;
  covid_19_dose_count: string;
  influenza_dose_count: string;
}

export interface VaccinationType {
  name: string;
  currentYear: number;
  fiveYearsAgo: number;
  tenYearsAgo: number;
  collectionMethod?: string;
  sourceUrl?: string;
  isReportingStopped?: boolean;
  lastAvailableRate?: number;
  lastAvailableDate?: string;
  calculationDetails?: {
    numerator: number;
    denominator: number;
    logic: string;
    sourceLocation: string;
  };
}

const VACCINE_NAME_MAP: Record<string, string> = {
  'DTaP': 'DTaP (Diphtheria, Tetanus, Pertussis)',
  'Polio': 'IPV (Inactivated Polio Vaccine)',
  'MMR': 'MMR (Measles, Mumps, Rubella)',
  'Varicella': 'Varicella (Chickenpox)',
  'HepB': 'Hepatitis B',
  'Hib': 'Hib (Haemophilus influenzae type b)',
  'PCV': 'PCV (Pneumococcal Conjugate)',
  '4313314': 'Combined 7-Vaccine Series (4:3:1:3:3:1:4)',
  '4:3:1:3:3:1:4': 'Combined 7-Vaccine Series (4:3:1:3:3:1:4)',
};

export class VaccinationService {
  private db = database;

  async syncData(): Promise<void> {
    try {
      await Promise.all([
        this.syncNysFluCovid(),
        this.syncChildhoodVaccines()
      ]);
      logger.syncComplete('vaccination', 'full_sync', 0, 0); 
    } catch (error) {
      logger.syncError('vaccination', 'full_sync', error as Error);
      throw error;
    }
  }

  private async syncNysFluCovid() {
    try {
      const response = await fetch(`${NYS_VAX_API}?geography_level=REST%20OF%20STATE&$limit=1000`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch NYS Vax API: ${response.statusText}`);
      }

      const data: NYSVaxRecord[] = await response.json() as any;
      
      let covidTotal = 0;
      let fluTotal = 0;
      let latestDate = '';
      let season = '2024-2025';

      if (data && data.length > 0) {
        for (const record of data) {
          covidTotal += parseInt(record.covid_19_dose_count) || 0;
          fluTotal += parseInt(record.influenza_dose_count) || 0;
        }

        const sortedByDate = [...data].sort((a, b) =>
          new Date(b.week_ending).getTime() - new Date(a.week_ending).getTime()
        );
        if (sortedByDate.length > 0 && sortedByDate[0]) {
          latestDate = sortedByDate[0].week_ending.split('T')[0] || '';
          season = sortedByDate[0].respiratory_season || season;
        }
      }

      const nysPopExcludingNYC = 11_600_000;

      const records: VaccinationType[] = [
        {
          name: 'COVID-19 (Seasonal Doses)',
          currentYear: 0,
          fiveYearsAgo: -1,
          tenYearsAgo: -1,
          collectionMethod: 'NYS Immunization Information System (NYSIIS) - Weekly Aggregate Reports',
          sourceUrl: NYS_VAX_API,
          isReportingStopped: false,
          lastAvailableRate: covidTotal,
          lastAvailableDate: `${season} Season (as of ${latestDate})`,
          calculationDetails: {
            numerator: covidTotal,
            denominator: nysPopExcludingNYC,
            logic: "Sum of weekly 'covid_19_dose_count' for REST OF STATE geography",
            sourceLocation: `NYS Open Data API: geography_level='REST OF STATE', respiratory_season='${season}'`
          }
        },
        {
          name: 'Influenza (Seasonal Doses)',
          currentYear: 0,
          fiveYearsAgo: -1,
          tenYearsAgo: -1,
          collectionMethod: 'NYS Immunization Information System (NYSIIS) - Weekly Aggregate Reports',
          sourceUrl: NYS_VAX_API,
          isReportingStopped: false,
          lastAvailableRate: fluTotal,
          lastAvailableDate: `${season} Season (as of ${latestDate})`,
          calculationDetails: {
            numerator: fluTotal,
            denominator: nysPopExcludingNYC,
            logic: "Sum of weekly 'influenza_dose_count' for REST OF STATE geography",
            sourceLocation: `NYS Open Data API: geography_level='REST OF STATE', respiratory_season='${season}'`
          }
        }
      ];

      await this.saveToDatabase('nys', records);
    } catch (error) {
      logger.error('Failed to sync NYS flu/covid data', { error });
      throw error;
    }
  }

  private async syncChildhoodVaccines() {
    try {
      const csvResult = await csvCacheService.getCachedCSV(CHILDHOOD_DATA_URL);
      
      const parsePromise = new Promise<ChildhoodVaccineRaw[]>((resolve, reject) => {
        Papa.parse(csvResult.data, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data as ChildhoodVaccineRaw[]),
          error: (err: Error) => reject(err)
        });
      });

      const rows = await parsePromise;
      const processed = this.processChildhoodRows(rows);
      await this.saveToDatabase('nyc', processed);
      
    } catch (error) {
      logger.error('Failed to sync childhood vaccines', { error });
      throw error;
    }
  }

  private processChildhoodRows(rows: ChildhoodVaccineRaw[]): VaccinationType[] {
    const vaccineGroups: Record<string, {
      weightedPercSum: number,
      totalPop: number,
      totalVaccinated: number
    }> = {};
    const latestYear = '2025';

    rows.forEach(row => {
      if (row.YEAR_COVERAGE !== latestYear) return;
      if (row.QUARTER && row.QUARTER !== 'Q2') return;

      const vacName = row.VACCINE_GROUP;
      const pop = parseFloat((row.POP_DENOMINATOR || '0').toString().replace(/,/g, ''));
      const perc = parseFloat((row.PERC_VAC || '0').toString().replace(/,/g, ''));
      const vaccinated = parseFloat((row.COUNT_PEOPLE_VAC || '0').toString().replace(/,/g, ''));

      let group = vaccineGroups[vacName];
      if (!group) {
        group = { weightedPercSum: 0, totalPop: 0, totalVaccinated: 0 };
        vaccineGroups[vacName] = group;
      }

      if (!isNaN(pop) && pop > 0 && !isNaN(perc)) {
        group.weightedPercSum += perc * pop;
        group.totalPop += pop;
      }
      if (!isNaN(vaccinated)) {
        group.totalVaccinated += vaccinated;
      }
    });

    return Object.keys(vaccineGroups).map(v => {
      const group = vaccineGroups[v];
      if (!group) return null;

      const { weightedPercSum, totalPop, totalVaccinated } = group;
      const rate = totalPop > 0 ? weightedPercSum / totalPop : 0;
      const displayName = VACCINE_NAME_MAP[v] || v;

      return {
        name: displayName,
        currentYear: parseFloat(rate.toFixed(1)),
        fiveYearsAgo: -1,
        tenYearsAgo: -1,
        lastAvailableRate: parseFloat(rate.toFixed(1)),
        lastAvailableDate: `${latestYear} Q2`,
        collectionMethod: 'NYC Citywide Immunization Registry (CIR)',
        sourceUrl: CHILDHOOD_DATA_URL,
        calculationDetails: {
          numerator: totalVaccinated,
          denominator: totalPop,
          logic: `Weighted average of validated rates from source data across demographic groups`,
          sourceLocation: `NYC Health GitHub CSV. Vaccine: ${v}, Period: ${latestYear} Q2`
        }
      };
    }).filter(v => v !== null) as VaccinationType[];
  }

  private async saveToDatabase(region: string, records: VaccinationType[]) {
    await this.db.run('DELETE FROM vaccination_data WHERE region = ?', [region]);

    for (const record of records) {
      await this.db.run(`
        INSERT INTO vaccination_data (
          region, vaccine_name, current_year, five_years_ago, ten_years_ago,
          last_available_rate, last_available_date, collection_method,
          source_url, calculation_details, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `, [
        region,
        record.name,
        record.currentYear,
        record.fiveYearsAgo,
        record.tenYearsAgo,
        record.lastAvailableRate,
        record.lastAvailableDate,
        record.collectionMethod,
        record.sourceUrl,
        JSON.stringify(record.calculationDetails)
      ]);
    }
  }

  async getData(): Promise<{ nyc: VaccinationType[], nys: VaccinationType[] }> {
    const rows = await this.db.all<any>('SELECT * FROM vaccination_data');
    
    const nyc: VaccinationType[] = [];
    const nys: VaccinationType[] = [];

    for (const row of rows) {
      const record: VaccinationType = {
        name: row.vaccine_name,
        currentYear: row.current_year,
        fiveYearsAgo: row.five_years_ago,
        tenYearsAgo: row.ten_years_ago,
        collectionMethod: row.collection_method,
        sourceUrl: row.source_url,
        lastAvailableRate: row.last_available_rate,
        lastAvailableDate: row.last_available_date,
        calculationDetails: row.calculation_details ? JSON.parse(row.calculation_details) : undefined
      };

      if (row.region === 'nyc') {
        nyc.push(record);
      } else {
        nys.push(record);
      }
    }

    const nysFluCovid = nys.filter(r => 
      r.name.includes('COVID') || r.name.includes('Influenza')
    );
    nyc.push(...nysFluCovid);

    return { nyc, nys };
  }
}

export const vaccinationService = new VaccinationService();