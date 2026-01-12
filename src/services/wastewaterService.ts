import { api } from './api';
import type { WastewaterData } from '../types';

export async function fetchWastewaterData(): Promise<WastewaterData> {
  const dashboardData = await api.fetchDashboardData();
  return dashboardData.wastewaterData;
}