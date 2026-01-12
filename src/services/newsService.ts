import { api } from './api';
import type { NewsData } from '../types';

export async function fetchNewsData(): Promise<NewsData> {
  const dashboardData = await api.fetchDashboardData();
  return dashboardData.newsData;
}