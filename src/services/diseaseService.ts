import { api } from './api';
import type { DiseaseStats } from '../types';

export async function fetchDiseaseStats(): Promise<DiseaseStats[]> {
  const dashboardData = await api.fetchDashboardData();
  return dashboardData.diseaseStats.nyc;
}