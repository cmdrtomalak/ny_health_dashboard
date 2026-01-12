import { api } from './api';
import type { VaccinationData } from '../types';

export async function fetchVaccinationData(forceRefresh = false): Promise<VaccinationData> {
  if (forceRefresh) {
    await api.requestRefresh();
  }
  
  const dashboardData = await api.fetchDashboardData();
  return dashboardData.vaccinationData;
}