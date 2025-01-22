import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Tab,
  Tabs,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { useAnalytics } from '../hooks/useAnalytics';
import { WaterDrop, Eco, WbSunny, Speed } from '@mui/icons-material';

const AnalyticsDashboard = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [activeTab, setActiveTab] = useState(0);

  // Fetch analytics data
  const waterUsage = useAnalytics('waterUsage', { days: timeRange });
  const efficiency = useAnalytics('efficiency', { days: timeRange });
  const soilHealth = useAnalytics('soilHealth', { days: timeRange });
  const predictions = useAnalytics('predictions', { days: timeRange });

  const timeRangeOptions = [
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
    { label: '90 Days', value: '90d' },
  ];

  const tabs = [
    { label: 'Overview', icon: <Speed /> },
    { label: 'Water Usage', icon: <WaterDrop /> },
    { label: 'Soil Health', icon: <Eco /> },
    { label: 'Weather Impact', icon: <WbSunny /> },
  ];

  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Water Usage Trends
            </Typography>
            <Box height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={waterUsage.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="usage"
                    stroke="#2196f3"
                    fill="#2196f3"
                    fillOpacity={0.3}
                    name="Water Usage (L)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              System Efficiency
            </Typography>
            <Box height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={efficiency.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="efficiency"
                    stroke="#4caf50"
                    name="Efficiency Score"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Soil Health Indicators
            </Typography>
            <Box height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={soilHealth.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="zone" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="moisture" fill="#2196f3" name="Moisture %" />
                  <Bar dataKey="ph" fill="#4caf50" name="pH Level" />
                  <Bar dataKey="nutrients" fill="#ff9800" name="Nutrient Score" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderWaterUsageTab = () => (
    <Grid container spacing={3}>
      {/* Detailed water usage analytics */}
    </Grid>
  );

  const renderSoilHealthTab = () => (
    <Grid container spacing={3}>
      {/* Detailed soil health analytics */}
    </Grid>
  );

  const renderWeatherImpactTab = () => (
    <Grid container spacing={3}>
      {/* Weather impact analytics */}
    </Grid>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 0:
        return renderOverviewTab();
      case 1:
        return renderWaterUsageTab();
      case 2:
        return renderSoilHealthTab();
      case 3:
        return renderWeatherImpactTab();
      default:
        return null;
    }
  };

  // Show loading state
  if (waterUsage.loading || efficiency.loading || soilHealth.loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  // Show error state
  if (waterUsage.error || efficiency.error || soilHealth.error) {
    return (
      <Alert severity="error">
        Error loading analytics data. Please try again later.
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              icon={tab.icon}
              label={tab.label}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Typography variant="body1">Time Range:</Typography>
          </Grid>
          {timeRangeOptions.map((option) => (
            <Grid item key={option.value}>
              <Button
                variant={timeRange === option.value ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setTimeRange(option.value)}
              >
                {option.label}
              </Button>
            </Grid>
          ))}
        </Grid>
      </Box>

      {renderContent()}

      {/* Recommendations Section */}
      {waterUsage.analyzeTrends?.recommendations.length > 0 && (
        <Box mt={3}>
          <Typography variant="h6" gutterBottom>
            System Recommendations
          </Typography>
          <Grid container spacing={2}>
            {waterUsage.analyzeTrends.recommendations.map((rec, index) => (
              <Grid item xs={12} key={index}>
                <Alert severity={rec.type === 'warning' ? 'warning' : 'info'}>
                  {rec.message}
                </Alert>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default AnalyticsDashboard;
