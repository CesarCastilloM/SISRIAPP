import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Tabs,
  Tab,
  CircularProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { API_BASE_URL } from '../config';
import DownloadIcon from '@mui/icons-material/Download';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';

const Analytics = () => {
  const [selectedZone, setSelectedZone] = useState('all');
  const [dateRange, setDateRange] = useState([null, null]);
  const [tabValue, setTabValue] = useState(0);
  const [zones, setZones] = useState([]);
  const [zoneData, setZoneData] = useState({});
  const [historicalData, setHistoricalData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [selectedZonesForComparison, setSelectedZonesForComparison] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/zones`);
        if (!response.ok) throw new Error('Failed to fetch zones');
        const data = await response.json();
        setZones(data.data || []);
      } catch (err) {
        console.error('Error fetching zones:', err);
        setError('Failed to load zones');
      } finally {
        setLoading(false);
      }
    };

    fetchZones();
  }, []);

  useEffect(() => {
    const fetchZoneData = async () => {
      if (selectedZone === 'all') return;
      
      try {
        setLoading(true);
        const [statsResponse, historicalResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/zones/${selectedZone}/statistics`),
          fetch(`${API_BASE_URL}/api/zones/${selectedZone}/historical`)
        ]);
        
        if (!statsResponse.ok) throw new Error('Failed to fetch zone data');
        if (!historicalResponse.ok) throw new Error('Failed to fetch historical data');
        
        const statsData = await statsResponse.json();
        const historicalData = await historicalResponse.json();
        
        setZoneData(statsData.data || {});
        setHistoricalData(historicalData.data || {});
      } catch (err) {
        console.error('Error fetching zone data:', err);
        setError('Failed to load zone data');
      } finally {
        setLoading(false);
      }
    };

    if (selectedZone !== 'all') {
      fetchZoneData();
    }
  }, [selectedZone]);

  const handleCompareZones = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/zones/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedZonesForComparison)
      });
      
      if (!response.ok) throw new Error('Failed to compare zones');
      const data = await response.json();
      setComparisonData(data.data);
      setCompareDialogOpen(false);
    } catch (err) {
      console.error('Error comparing zones:', err);
      setError('Failed to compare zones');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/zones/${selectedZone}/export`);
      if (!response.ok) throw new Error('Failed to export data');
      const data = await response.json();
      
      // Create and download file
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zone_${selectedZone}_export.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting data:', err);
      setError('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const renderHistoricalCharts = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6">Soil Moisture & Irrigation</Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={historicalData?.daily_data || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <ChartTooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="soil_moisture" stroke="#8884d8" name="Soil Moisture (%)" />
                  <Line yAxisId="right" type="monotone" dataKey="irrigation_amount" stroke="#82ca9d" name="Irrigation (mm)" />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6">Vegetation Indices</Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={historicalData?.daily_data || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="ndvi" stroke="#8884d8" name="NDVI" />
                  <Line type="monotone" dataKey="evi" stroke="#82ca9d" name="EVI" />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderComparisonCharts = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6">Water Usage Comparison</Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={Object.entries(comparisonData?.summary?.total_water_used || {}).map(([id, value]) => ({
                  zone: comparisonData?.zones[id]?.name || id,
                  value
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="zone" />
                  <YAxis />
                  <ChartTooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#8884d8" name="Total Water Used (mm)" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6">Soil Health Comparison</Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={Object.entries(comparisonData?.summary?.avg_soil_moisture || {}).map(([id, value]) => ({
                  zone: comparisonData?.zones[id]?.name || id,
                  moisture: value,
                  stress: comparisonData?.summary?.water_stress_levels[id] || 0
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="zone" />
                  <YAxis />
                  <ChartTooltip />
                  <Legend />
                  <Bar dataKey="moisture" fill="#82ca9d" name="Soil Moisture (%)" />
                  <Bar dataKey="stress" fill="#ffc658" name="Water Stress" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth>
                    <InputLabel>Select Zone</InputLabel>
                    <Select
                      value={selectedZone}
                      onChange={(e) => setSelectedZone(e.target.value)}
                      label="Select Zone"
                    >
                      <MenuItem value="all">All Zones</MenuItem>
                      {zones.map((zone) => (
                        <MenuItem key={zone.zone_id} value={zone.zone_id}>
                          {zone.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <Box display="flex" gap={2}>
                      <DatePicker
                        label="Start Date"
                        value={dateRange[0]}
                        onChange={(newValue) => setDateRange([newValue, dateRange[1]])}
                      />
                      <DatePicker
                        label="End Date"
                        value={dateRange[1]}
                        onChange={(newValue) => setDateRange([dateRange[0], newValue])}
                      />
                    </Box>
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12} md={2}>
                  <Box display="flex" gap={1}>
                    <Tooltip title="Compare Zones">
                      <IconButton onClick={() => setCompareDialogOpen(true)}>
                        <CompareArrowsIcon />
                      </IconButton>
                    </Tooltip>
                    {selectedZone !== 'all' && (
                      <Tooltip title="Export Data">
                        <IconButton onClick={handleExportData}>
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {selectedZone !== 'all' && zoneData && (
          <>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Soil Health</Typography>
                  {zoneData.soil_health && (
                    <>
                      <Typography>Moisture: {zoneData.soil_health.moisture}%</Typography>
                      <Typography>Water Stress: {zoneData.soil_health.water_stress}</Typography>
                      <Typography>Stress Level: {zoneData.soil_health.stress_level}</Typography>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Vegetation Indices</Typography>
                  {zoneData.current_indices && (
                    <>
                      <Typography>NDVI: {zoneData.current_indices.ndvi}</Typography>
                      <Typography>NDWI: {zoneData.current_indices.ndwi}</Typography>
                      <Typography>EVI: {zoneData.current_indices.evi}</Typography>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Irrigation Summary</Typography>
                  <Typography>Total Events: {zoneData.irrigation_count}</Typography>
                  <Typography>Total Water Used: {zoneData.total_water_used} mm</Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6">Crop Information</Typography>
                  {zoneData.crop_info && (
                    <>
                      <Typography>Type: {zoneData.crop_info.type}</Typography>
                      <Typography>Planting Date: {new Date(zoneData.crop_info.planting_date).toLocaleDateString()}</Typography>
                      <Typography>Expected Harvest: {new Date(zoneData.crop_info.expected_harvest).toLocaleDateString()}</Typography>
                      <Typography>Days to Harvest: {zoneData.crop_info.days_to_harvest}</Typography>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {historicalData && (
              <Grid item xs={12}>
                {renderHistoricalCharts()}
              </Grid>
            )}
          </>
        )}

        {comparisonData && (
          <Grid item xs={12}>
            {renderComparisonCharts()}
          </Grid>
        )}
      </Grid>

      <Dialog open={compareDialogOpen} onClose={() => setCompareDialogOpen(false)}>
        <DialogTitle>Compare Zones</DialogTitle>
        <DialogContent>
          <Box sx={{ minWidth: 300, mt: 2 }}>
            {zones.map((zone) => (
              <FormControlLabel
                key={zone.zone_id}
                control={
                  <Checkbox
                    checked={selectedZonesForComparison.includes(zone.zone_id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedZonesForComparison([...selectedZonesForComparison, zone.zone_id]);
                      } else {
                        setSelectedZonesForComparison(selectedZonesForComparison.filter(id => id !== zone.zone_id));
                      }
                    }}
                  />
                }
                label={zone.name}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompareDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCompareZones} variant="contained" color="primary">
            Compare
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Analytics;
