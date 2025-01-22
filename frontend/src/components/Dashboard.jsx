import React, { useState, useEffect } from 'react';
import {
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Card,
  CardContent,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  AlertTitle,
  useTheme,
  useMediaQuery,
  Container,
  Grid,
  Button,
} from '@mui/material';
import {
  WaterDrop,
  Map,
  Timeline,
  Settings,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Cloud as CloudIcon,
  Satellite as SatelliteIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { API_BASE_URL } from '../config';

// Import components
import ZoneManagement from './zones/ZoneManagement';
import WeatherWidget from './WeatherWidget';
import SatelliteView from './SatelliteView';
import IrrigationManagement from './irrigation/IrrigationManagement';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/api/dashboard`);
      setData(response.data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err.response?.data?.detail || 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchDashboardData();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={handleRefresh}>
              RETRY
            </Button>
          }
        >
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ pb: 7 }}>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Dashboard
          </Typography>
          <IconButton onClick={handleRefresh} color="primary">
            <RefreshIcon />
          </IconButton>
        </Box>

        <Grid container spacing={3}>
          {/* Summary Cards */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Zones
                </Typography>
                <Typography variant="h5">
                  {data?.total_zones || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Active Zones
                </Typography>
                <Typography variant="h5">
                  {data?.active_zones || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Water Usage
                </Typography>
                <Typography variant="h5">
                  {data?.total_water_usage?.toFixed(2) || '0.00'} L
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Avg Soil Moisture
                </Typography>
                <Typography variant="h5">
                  {data?.soil_moisture_avg?.toFixed(1) || '0.0'}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Alerts */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Alerts
                </Typography>
                {data?.recent_alerts?.map((alert, index) => (
                  <Alert severity="info" key={index} sx={{ mb: 1 }}>
                    {alert}
                  </Alert>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {/* Zone Summaries */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Zone Status
                </Typography>
                <Grid container spacing={2}>
                  {data?.zone_summaries?.map((zone) => (
                    <Grid item xs={12} sm={6} md={4} key={zone.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6">{zone.name}</Typography>
                          <Typography color="textSecondary">
                            Moisture: {zone.moisture}%
                          </Typography>
                          <Typography color="textSecondary">
                            Last Watered: {zone.last_watered}
                          </Typography>
                          <Typography color="textSecondary">
                            Status: {zone.status}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Bottom Navigation */}
      <BottomNavigation
        value={currentTab}
        onChange={(event, newValue) => {
          setCurrentTab(newValue);
        }}
        showLabels
        sx={{
          width: '100%',
          position: 'fixed',
          bottom: 0,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <BottomNavigationAction label="Overview" icon={<Timeline />} />
        <BottomNavigationAction label="Zones" icon={<Map />} />
        <BottomNavigationAction label="Weather" icon={<CloudIcon />} />
        <BottomNavigationAction label="Satellite" icon={<SatelliteIcon />} />
      </BottomNavigation>
    </Box>
  );
};

export default Dashboard;
