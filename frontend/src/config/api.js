// config/api.js
const getApiUrl = () => {
    // Check if we're in development or production
    if (process.env.NODE_ENV === 'development') {
      return process.env.REACT_APP_API_URL || 'http://localhost:8000';
    }
    return process.env.REACT_APP_API_URL;
  };
  
  export const API_CONFIG = {
    baseURL: getApiUrl(),
    endpoints: {
      leagues: '/api/leagues',
      gameweek: '/api/gameweek',
      players: '/api/players',
      statistics: '/api/statistics'
    }
  };
  
  // For debugging
  console.log('Current API URL:', API_CONFIG.baseURL);
  console.log('Environment:', process.env.NODE_ENV);