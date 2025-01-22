import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const ANALYTICS_ENDPOINTS = {
  waterUsage: '/api/analytics/water-usage',
  efficiency: '/api/analytics/efficiency',
  predictions: '/api/analytics/predictions',
  soilHealth: '/api/analytics/soil-health',
  weatherTrends: '/api/analytics/weather-trends',
  cropHealth: '/api/analytics/crop-health',
};

export const useAnalytics = (metric, params = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const queryParams = useMemo(() => new URLSearchParams(params).toString(), [params]);

  useEffect(() => {
    const controller = new AbortController();
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const endpoint = ANALYTICS_ENDPOINTS[metric];
        if (!endpoint) throw new Error(`Invalid metric: ${metric}`);

        const response = await axios.get(`${endpoint}?${queryParams}`, {
          signal: controller.signal,
        });

        setData(response.data);
        setError(null);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [metric, queryParams]);

  const analyzeTrends = useMemo(() => {
    if (!data) return null;

    return {
      average: calculateAverage(data),
      trend: calculateTrend(data),
      anomalies: detectAnomalies(data),
      recommendations: generateRecommendations(data),
    };
  }, [data]);

  return {
    data,
    loading,
    error,
    analyzeTrends,
    isStale: checkDataFreshness(data),
  };
};

// Analytics utility functions
const calculateAverage = (data) => {
  if (!Array.isArray(data)) return null;
  return data.reduce((acc, val) => acc + val.value, 0) / data.length;
};

const calculateTrend = (data) => {
  if (!Array.isArray(data) || data.length < 2) return null;
  
  const xMean = (data.length - 1) / 2;
  const yMean = data.reduce((acc, val) => acc + val.value, 0) / data.length;
  
  let numerator = 0;
  let denominator = 0;
  
  data.forEach((point, index) => {
    const x = index - xMean;
    const y = point.value - yMean;
    numerator += x * y;
    denominator += x * x;
  });
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  return {
    slope,
    direction: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
    strength: Math.abs(slope),
  };
};

const detectAnomalies = (data) => {
  if (!Array.isArray(data)) return [];
  
  const mean = calculateAverage(data);
  const stdDev = calculateStandardDeviation(data, mean);
  const threshold = 2; // Number of standard deviations for anomaly detection
  
  return data.filter(point => 
    Math.abs(point.value - mean) > threshold * stdDev
  );
};

const calculateStandardDeviation = (data, mean) => {
  if (!Array.isArray(data)) return 0;
  
  const squareDiffs = data.map(point => 
    Math.pow(point.value - mean, 2)
  );
  
  const avgSquareDiff = squareDiffs.reduce((acc, val) => acc + val, 0) / data.length;
  return Math.sqrt(avgSquareDiff);
};

const generateRecommendations = (data) => {
  if (!data) return [];
  
  const recommendations = [];
  const trend = calculateTrend(data);
  const anomalies = detectAnomalies(data);
  
  if (trend.direction === 'increasing' && trend.strength > 0.5) {
    recommendations.push({
      type: 'warning',
      message: 'Significant increase detected. Consider adjusting irrigation schedule.',
      priority: 'high',
    });
  }
  
  if (anomalies.length > 0) {
    recommendations.push({
      type: 'alert',
      message: `${anomalies.length} anomalies detected. Review system performance.`,
      priority: 'high',
    });
  }
  
  return recommendations;
};

const checkDataFreshness = (data) => {
  if (!data || !data.timestamp) return true;
  const staleThreshold = 5 * 60 * 1000; // 5 minutes
  return Date.now() - new Date(data.timestamp).getTime() > staleThreshold;
};
