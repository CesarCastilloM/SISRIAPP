import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, Scatter
} from 'recharts';
import { 
  Card, CardContent, Typography, Grid, Box,
  Tabs, Tab, CircularProgress, Alert,
  Button, Select, MenuItem
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useAnalytics from '../hooks/useAnalytics';

const AdvancedAnalytics = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('week');
  const [selectedMetrics, setSelectedMetrics] = useState(['soil_moisture', 'temperature']);
  
  const { 
    cropHealth,
    waterUsage,
    soilConditions,
    weatherImpact,
    loading,
    error
  } = useAnalytics(timeRange);

  const chartColors = useMemo(() => ({
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
  }), [theme]);

  const renderCropHealthChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={cropHealth?.timeSeriesData || []}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip />
        <Legend />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="ndvi"
          fill={chartColors.primary}
          stroke={chartColors.primary}
          fillOpacity={0.3}
          name="Vegetation Index"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="stress_level"
          stroke={chartColors.warning}
          name="Stress Level"
        />
        <Scatter
          yAxisId="right"
          dataKey="disease_probability"
          fill={chartColors.error}
          name="Disease Risk"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );

  const renderWaterUsageChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={waterUsage?.dailyUsage || []}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar
          dataKey="actual"
          fill={chartColors.primary}
          name="Actual Usage"
        />
        <Bar
          dataKey="predicted"
          fill={chartColors.secondary}
          name="Predicted Usage"
        />
        <Bar
          dataKey="saved"
          fill={chartColors.success}
          name="Water Saved"
        />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderSoilConditionsChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={soilConditions?.timeSeriesData || []}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis />
        <Tooltip />
        <Legend />
        {selectedMetrics.map((metric, index) => (
          <Line
            key={metric}
            type="monotone"
            dataKey={metric}
            stroke={Object.values(chartColors)[index]}
            name={metric.replace('_', ' ').toUpperCase()}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );

  const renderWeatherImpactChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={weatherImpact?.timeSeriesData || []}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Area
          type="monotone"
          dataKey="temperature"
          stackId="1"
          stroke={chartColors.warning}
          fill={chartColors.warning}
          fillOpacity={0.3}
        />
        <Area
          type="monotone"
          dataKey="humidity"
          stackId="1"
          stroke={chartColors.primary}
          fill={chartColors.primary}
          fillOpacity={0.3}
        />
        <Area
          type="monotone"
          dataKey="precipitation"
          stackId="1"
          stroke={chartColors.success}
          fill={chartColors.success}
          fillOpacity={0.3}
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderMetricsSelector = () => (
    <Box sx={{ mb: 2 }}>
      <Select
        multiple
        value={selectedMetrics}
        onChange={(e) => setSelectedMetrics(e.target.value)}
        renderValue={(selected) => selected.join(', ')}
        sx={{ width: 300 }}
      >
        <MenuItem value="soil_moisture">Soil Moisture</MenuItem>
        <MenuItem value="temperature">Temperature</MenuItem>
        <MenuItem value="humidity">Humidity</MenuItem>
        <MenuItem value="ph_level">pH Level</MenuItem>
        <MenuItem value="nitrogen">Nitrogen</MenuItem>
        <MenuItem value="phosphorus">Phosphorus</MenuItem>
        <MenuItem value="potassium">Potassium</MenuItem>
      </Select>
    </Box>
  );

  const renderTimeRangeSelector = () => (
    <Box sx={{ mb: 2 }}>
      <Button
        variant={timeRange === 'day' ? 'contained' : 'outlined'}
        onClick={() => setTimeRange('day')}
        sx={{ mr: 1 }}
      >
        Day
      </Button>
      <Button
        variant={timeRange === 'week' ? 'contained' : 'outlined'}
        onClick={() => setTimeRange('week')}
        sx={{ mr: 1 }}
      >
        Week
      </Button>
      <Button
        variant={timeRange === 'month' ? 'contained' : 'outlined'}
        onClick={() => setTimeRange('month')}
      >
        Month
      </Button>
    </Box>
  );

  const renderAnalyticsSummary = () => {
    if (!cropHealth || !waterUsage) return null;

    return (
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Crop Health Score</Typography>
              <Typography variant="h4" color="primary">
                {cropHealth.healthScore}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Water Efficiency</Typography>
              <Typography variant="h4" color="secondary">
                {waterUsage.efficiency}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Disease Risk</Typography>
              <Typography variant="h4" color="error">
                {cropHealth.diseaseRisk}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Water Saved</Typography>
              <Typography variant="h4" color="success">
                {waterUsage.waterSaved}L
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Error loading analytics data: {error.message}
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {renderTimeRangeSelector()}
      {renderAnalyticsSummary()}
      
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        sx={{ mb: 2 }}
      >
        <Tab label="Crop Health" />
        <Tab label="Water Usage" />
        <Tab label="Soil Conditions" />
        <Tab label="Weather Impact" />
      </Tabs>

      {activeTab === 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Crop Health Analysis
            </Typography>
            {renderCropHealthChart()}
          </CardContent>
        </Card>
      )}

      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Water Usage Analysis
            </Typography>
            {renderWaterUsageChart()}
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Soil Conditions
            </Typography>
            {renderMetricsSelector()}
            {renderSoilConditionsChart()}
          </CardContent>
        </Card>
      )}

      {activeTab === 3 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Weather Impact Analysis
            </Typography>
            {renderWeatherImpactChart()}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default AdvancedAnalytics;
