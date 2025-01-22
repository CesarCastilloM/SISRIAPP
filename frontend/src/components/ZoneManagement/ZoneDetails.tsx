import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Button,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { formatDate } from '../../utils/dateUtils';

interface ZoneDetailsProps {
  zoneId: string;
}

interface ZoneData {
  zone_info: {
    name: string;
    area_hectares: number;
    crop_type: string;
    soil_type: string;
    irrigation_type: string;
    planting_date: string;
    expected_harvest: string;
  };
  current_data: {
    soil_moisture: number;
    ndvi: number;
    evi: number;
    water_stress: number;
  };
  irrigation_summary: {
    total_water_used: number;
    event_count: number;
    last_irrigation: {
      timestamp: string;
      amount: number;
      duration: number;
      type: string;
    } | null;
  };
  historical_data: {
    daily_data: Array<{
      date: string;
      irrigation_amount: number;
      soil_moisture: number;
      ndvi: number;
      evi: number;
      water_stress: number;
    }>;
    summary: {
      total_irrigation: number;
      avg_soil_moisture: number;
      avg_ndvi: number;
      avg_evi: number;
      avg_water_stress: number;
    };
  };
}

const ZoneDetails: React.FC<ZoneDetailsProps> = ({ zoneId }) => {
  const [zoneData, setZoneData] = useState<ZoneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const fetchZoneData = async (refresh: boolean = false) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/zones/${zoneId}/data${refresh ? '?refresh=true' : ''}`);
      if (!response.ok) throw new Error('Failed to fetch zone data');
      const data = await response.json();
      setZoneData(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZoneData();
  }, [zoneId]);

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!zoneData) return <Typography>No data available</Typography>;

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const renderCurrentStatus = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Current Conditions</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Soil Moisture</Typography>
                <Typography variant="h6">{(zoneData.current_data.soil_moisture * 100).toFixed(1)}%</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Water Stress</Typography>
                <Typography variant="h6">{(zoneData.current_data.water_stress * 100).toFixed(1)}%</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">NDVI</Typography>
                <Typography variant="h6">{zoneData.current_data.ndvi.toFixed(2)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">EVI</Typography>
                <Typography variant="h6">{zoneData.current_data.evi.toFixed(2)}</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Irrigation Summary</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Total Water Used</Typography>
                <Typography variant="h6">{zoneData.irrigation_summary.total_water_used.toFixed(1)} m³</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">Irrigation Events</Typography>
                <Typography variant="h6">{zoneData.irrigation_summary.event_count}</Typography>
              </Grid>
              {zoneData.irrigation_summary.last_irrigation && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="textSecondary">Last Irrigation</Typography>
                    <Typography variant="body1">
                      {formatDate(zoneData.irrigation_summary.last_irrigation.timestamp)}
                    </Typography>
                    <Typography variant="body2">
                      {zoneData.irrigation_summary.last_irrigation.amount} m³ for {zoneData.irrigation_summary.last_irrigation.duration} minutes
                    </Typography>
                  </Grid>
                </>
              )}
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderHistoricalData = () => (
    <Box mt={3}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Historical Data</Typography>
          <Box height={400}>
            <LineChart
              width={800}
              height={350}
              data={zoneData.historical_data.daily_data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="soil_moisture"
                stroke="#8884d8"
                name="Soil Moisture"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="ndvi"
                stroke="#82ca9d"
                name="NDVI"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="water_stress"
                stroke="#ff7300"
                name="Water Stress"
              />
            </LineChart>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  const renderZoneInfo = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Zone Information</Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} md={3}>
            <Typography variant="body2" color="textSecondary">Name</Typography>
            <Typography variant="body1">{zoneData.zone_info.name}</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="body2" color="textSecondary">Area</Typography>
            <Typography variant="body1">{zoneData.zone_info.area_hectares.toFixed(1)} ha</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="body2" color="textSecondary">Crop Type</Typography>
            <Typography variant="body1">{zoneData.zone_info.crop_type}</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="body2" color="textSecondary">Soil Type</Typography>
            <Typography variant="body1">{zoneData.zone_info.soil_type}</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="body2" color="textSecondary">Irrigation Type</Typography>
            <Typography variant="body1">{zoneData.zone_info.irrigation_type}</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="body2" color="textSecondary">Planting Date</Typography>
            <Typography variant="body1">{formatDate(zoneData.zone_info.planting_date)}</Typography>
          </Grid>
          <Grid item xs={6} md={3}>
            <Typography variant="body2" color="textSecondary">Expected Harvest</Typography>
            <Typography variant="body1">{formatDate(zoneData.zone_info.expected_harvest)}</Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">{zoneData.zone_info.name}</Typography>
        <Button variant="contained" color="primary" onClick={() => fetchZoneData(true)}>
          Refresh Data
        </Button>
      </Box>

      {renderZoneInfo()}
      
      <Box mt={3}>
        <Tabs value={activeTab} onChange={handleTabChange} centered>
          <Tab label="Current Status" />
          <Tab label="Historical Data" />
        </Tabs>
      </Box>

      <Box mt={3}>
        {activeTab === 0 ? renderCurrentStatus() : renderHistoricalData()}
      </Box>
    </Box>
  );
};

export default ZoneDetails;
