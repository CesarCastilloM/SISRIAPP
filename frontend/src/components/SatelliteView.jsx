import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Info,
  Download,
  Satellite as SatelliteIcon,
  WaterDrop,
  Grass,
} from '@mui/icons-material';

const SatelliteView = () => {
  const [viewType, setViewType] = useState('ndvi');
  const [loading, setLoading] = useState(false);

  const handleViewChange = (event, newValue) => {
    setViewType(newValue);
  };

  const getColorScale = (value, type) => {
    if (!value) return '#ffffff';
    
    if (type === 'ndvi') {
      // NDVI color scale (-1 to 1)
      if (value < 0) return '#ff0000';
      if (value < 0.2) return '#ff8c00';
      if (value < 0.4) return '#ffff00';
      if (value < 0.6) return '#90ee90';
      return '#006400';
    } else if (type === 'moisture') {
      // Soil moisture color scale (0-100%)
      if (value < 20) return '#8b4513';
      if (value < 40) return '#deb887';
      if (value < 60) return '#90ee90';
      if (value < 80) return '#4682b4';
      return '#000080';
    }
    return '#ffffff';
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" display="flex" alignItems="center">
                <SatelliteIcon sx={{ mr: 1 }} />
                Satellite View
              </Typography>
              <Box>
                <Tooltip title="Download satellite data">
                  <IconButton>
                    <Download />
                  </IconButton>
                </Tooltip>
                <Tooltip title="About satellite data">
                  <IconButton>
                    <Info />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            <Tabs
              value={viewType}
              onChange={handleViewChange}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
              sx={{ mb: 2 }}
            >
              <Tab
                icon={<Grass />}
                label="NDVI"
                value="ndvi"
                sx={{ textTransform: 'none' }}
              />
              <Tab
                icon={<WaterDrop />}
                label="Soil Moisture"
                value="moisture"
                sx={{ textTransform: 'none' }}
              />
            </Tabs>

            <Box
              sx={{
                height: 400,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                bgcolor: 'background.default',
                borderRadius: 1,
              }}
            >
              {loading ? (
                <CircularProgress />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No satellite data available. Please select a zone to view satellite imagery.
                </Typography>
              )}
            </Box>

            <Box mt={2}>
              <Typography variant="subtitle2" gutterBottom>
                Legend
              </Typography>
              <Grid container spacing={1}>
                {viewType === 'ndvi' ? (
                  <>
                    <Grid item xs={2.4}>
                      <Box sx={{ bgcolor: '#ff0000', height: 20, borderRadius: 1 }} />
                      <Typography variant="caption">No Vegetation</Typography>
                    </Grid>
                    <Grid item xs={2.4}>
                      <Box sx={{ bgcolor: '#ff8c00', height: 20, borderRadius: 1 }} />
                      <Typography variant="caption">Sparse</Typography>
                    </Grid>
                    <Grid item xs={2.4}>
                      <Box sx={{ bgcolor: '#ffff00', height: 20, borderRadius: 1 }} />
                      <Typography variant="caption">Moderate</Typography>
                    </Grid>
                    <Grid item xs={2.4}>
                      <Box sx={{ bgcolor: '#90ee90', height: 20, borderRadius: 1 }} />
                      <Typography variant="caption">Good</Typography>
                    </Grid>
                    <Grid item xs={2.4}>
                      <Box sx={{ bgcolor: '#006400', height: 20, borderRadius: 1 }} />
                      <Typography variant="caption">Dense</Typography>
                    </Grid>
                  </>
                ) : (
                  <>
                    <Grid item xs={2.4}>
                      <Box sx={{ bgcolor: '#8b4513', height: 20, borderRadius: 1 }} />
                      <Typography variant="caption">Very Dry</Typography>
                    </Grid>
                    <Grid item xs={2.4}>
                      <Box sx={{ bgcolor: '#deb887', height: 20, borderRadius: 1 }} />
                      <Typography variant="caption">Dry</Typography>
                    </Grid>
                    <Grid item xs={2.4}>
                      <Box sx={{ bgcolor: '#90ee90', height: 20, borderRadius: 1 }} />
                      <Typography variant="caption">Moderate</Typography>
                    </Grid>
                    <Grid item xs={2.4}>
                      <Box sx={{ bgcolor: '#4682b4', height: 20, borderRadius: 1 }} />
                      <Typography variant="caption">Moist</Typography>
                    </Grid>
                    <Grid item xs={2.4}>
                      <Box sx={{ bgcolor: '#000080', height: 20, borderRadius: 1 }} />
                      <Typography variant="caption">Very Moist</Typography>
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default SatelliteView;
