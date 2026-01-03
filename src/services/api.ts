import axios from 'axios';

const API_BASE_URL = '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export interface DashboardData {
  vaccinationData: any;
  diseaseStats: any;
  wastewaterData: any;
  newsData: any;
  cacheMetadata: {
    lastFetched: string;
    csvCache: any;
  };
}

export interface RefreshResult {
  status: 'scheduled' | 'buffered' | 'rejected';
  scheduledTime?: string;
  message: string;
}

export const api = {
  fetchDashboardData: async (): Promise<DashboardData> => {
    const response = await apiClient.get<DashboardData>('/dashboard');
    return response.data;
  },

  requestRefresh: async (admin = false): Promise<RefreshResult> => {
    const response = await apiClient.post<RefreshResult>(`/refresh${admin ? '?admin=true' : ''}`);
    return response.data;
  },

  checkStatus: async () => {
    const response = await apiClient.get('/status');
    return response.data;
  }
};