// services/api.js
import axios from 'axios';
import { API_CONFIG } from '../config/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_CONFIG.baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Timeout in milliseconds
  timeout: 10000,
});

// Request interceptor for debugging
api.interceptors.request.use((config) => {
  console.log('API Request:', {
    url: config.url,
    method: config.method,
    baseURL: config.baseURL,
  });
  return config;
});

// Response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error('API Error:', {
      message: error.message,
      url: error.config?.url,
      status: error.response?.status,
    });
    return Promise.reject(error);
  }
);

// API functions
export const leagueAPI = {
  getLeague: async (leagueId) => {
    try {
      const response = await api.get(`${API_CONFIG.endpoints.leagues}/${leagueId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching league:', error);
      throw error;
    }
  },
  
  getGameweekData: async (leagueId) => {
    try {
      const response = await api.get(`${API_CONFIG.endpoints.leagues}/${leagueId}/gameweek`);
      return response.data;
    } catch (error) {
      console.error('Error fetching gameweek data:', error);
      throw error;
    }
  },
  
  getLeagueStatistics: async (leagueId) => {
    try {
      const response = await api.get(`${API_CONFIG.endpoints.leagues}/${leagueId}/statistics`);
      return response.data;
    } catch (error) {
      console.error('Error fetching league statistics:', error);
      throw error;
    }
  }
};