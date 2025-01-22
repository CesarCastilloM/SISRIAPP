// API Configuration
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? process.env.REACT_APP_API_URL || 'https://sisriapp.up.railway.app'
  : 'http://localhost:8000';

// Feature Flags
export const ENABLE_WEATHER = process.env.REACT_APP_ENABLE_WEATHER !== 'false';
export const ENABLE_GEE = process.env.REACT_APP_ENABLE_GEE !== 'false';

// Map Configuration
export const DEFAULT_CENTER = [19.4326, -99.1332];
export const DEFAULT_ZOOM = 15;

// Refresh Intervals (in milliseconds)
export const WEATHER_REFRESH_INTERVAL = 300000; // 5 minutes
export const ZONE_REFRESH_INTERVAL = 60000; // 1 minute

// Database Configuration
export const DB_CONFIG = {
  host: 'autorack.proxy.rlwy.net',
  port: 24840,
  database: 'railway',
  user: 'root',
  password: 'brjPUAePrxlCtJclfAYlGekGGturlDLN'
};
