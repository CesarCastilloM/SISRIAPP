import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import {
  WbSunny,
  Opacity,
  Air,
  Thermostat,
  WaterDrop,
  CloudQueue,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const WeatherWidget = ({ zoneId, zoneName }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weatherData, setWeatherData] = useState(null);

  const fetchWeatherData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/api/zones/${zoneId}/weather`);
      setWeatherData(response.data.weather_data);
    } catch (err) {
      console.error('Error fetching weather data:', err);
      setError(err.response?.data?.detail || 'Failed to load weather data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (zoneId) {
      fetchWeatherData();
      // Refresh weather data every 30 minutes
      const interval = setInterval(fetchWeatherData, 30 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [zoneId]);

  const WeatherIndicator = ({ icon: Icon, label, value, unit }) => (
    <Box display="flex" alignItems="center" gap={1}>
      <Icon color="primary" />
      <Box>
        <Typography variant="body2" color="textSecondary">
          {label}
        </Typography>
        <Typography variant="h6">
          {value ? `${value}${unit}` : '--'}
        </Typography>
      </Box>
    </Box>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  const currentWeather = weatherData?.current || {};
  const forecast = weatherData?.forecast || [];

  return (
    <Grid container spacing={3}>
      {/* Zone Title */}
      <Grid item xs={12}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" component="h2">
            Weather for {zoneName}
          </Typography>
          <IconButton onClick={fetchWeatherData} size="small">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Grid>

      {/* Current Weather Card */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom display="flex" alignItems="center">
              <WbSunny sx={{ mr: 1 }} />
              Current Conditions
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={6}>
                <WeatherIndicator
                  icon={Thermostat}
                  label="Temperature"
                  value={currentWeather.temperature?.toFixed(1)}
                  unit="°C"
                />
              </Grid>
              <Grid item xs={6}>
                <WeatherIndicator
                  icon={Opacity}
                  label="Humidity"
                  value={currentWeather.humidity?.toFixed(0)}
                  unit="%"
                />
              </Grid>
              <Grid item xs={6}>
                <WeatherIndicator
                  icon={WaterDrop}
                  label="Soil Moisture"
                  value={currentWeather.soil_moisture?.toFixed(1)}
                  unit="%"
                />
              </Grid>
              <Grid item xs={6}>
                <WeatherIndicator
                  icon={CloudQueue}
                  label="Rain Chance"
                  value={currentWeather.precipitation_probability?.toFixed(0)}
                  unit="%"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Forecast Card */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              7-Day Forecast
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={forecast}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { weekday: 'short' })}
                />
                <YAxis yAxisId="temp" orientation="left" label={{ value: '°C', position: 'insideLeft' }} />
                <YAxis yAxisId="precip" orientation="right" label={{ value: 'mm', position: 'insideRight' }} />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  formatter={(value, name) => [value.toFixed(1), name]}
                />
                <Legend />
                <Line 
                  yAxisId="temp"
                  type="monotone" 
                  dataKey="temperature_max" 
                  name="Max Temp" 
                  stroke="#ff7300" 
                />
                <Line 
                  yAxisId="temp"
                  type="monotone" 
                  dataKey="temperature_min" 
                  name="Min Temp" 
                  stroke="#82ca9d" 
                />
                <Line 
                  yAxisId="precip"
                  type="monotone" 
                  dataKey="precipitation" 
                  name="Rain" 
                  stroke="#8884d8" 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default WeatherWidget;
