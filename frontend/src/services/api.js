import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
});

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh token yet
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post('/auth/refresh', { refreshToken });
        const { token } = response.data;

        localStorage.setItem('token', token);
        originalRequest.headers.Authorization = `Bearer ${token}`;

        return api(originalRequest);
      } catch (error) {
        // Refresh token failed, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export const weatherApi = {
  getForecast: (lat, lon) => api.get(`/weather/forecast?lat=${lat}&lon=${lon}`),
  getCurrentConditions: (lat, lon) => api.get(`/weather/current?lat=${lat}&lon=${lon}`),
};

export const satelliteApi = {
  getLatestImagery: (zoneId) => api.get(`/satellite/latest/${zoneId}`),
  getHistoricalData: (zoneId, startDate, endDate) => 
    api.get(`/satellite/historical/${zoneId}`, { params: { startDate, endDate } }),
};

export const zoneApi = {
  getAllZones: () => api.get('/zones'),
  getZone: (id) => api.get(`/zones/${id}`),
  createZone: (data) => api.post('/zones', data),
  updateZone: (id, data) => api.put(`/zones/${id}`, data),
  deleteZone: (id) => api.delete(`/zones/${id}`),
  getZoneSensorData: (id) => api.get(`/zones/${id}/sensor-data`),
};

export const analyticsApi = {
  getWaterUsage: (zoneId, period) => api.get(`/analytics/water-usage/${zoneId}`, { params: { period } }),
  getCropHealth: (zoneId) => api.get(`/analytics/crop-health/${zoneId}`),
  getSystemMetrics: () => api.get('/analytics/system-metrics'),
};

export default api;
