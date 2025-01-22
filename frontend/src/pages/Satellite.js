import React from 'react';
import { Grid, Card, CardContent, Typography, Box, Button } from '@mui/material';
import { Satellite as SatelliteIcon, Update, Download } from '@mui/icons-material';

export default function Satellite() {
  const satelliteData = [
    {
      id: 1,
      zone: 'Front Lawn',
      ndvi: 0.75,
      lastUpdate: '2 hours ago',
      health: 'Good',
      recommendation: 'Maintain current watering schedule'
    },
    {
      id: 2,
      zone: 'Backyard',
      ndvi: 0.65,
      lastUpdate: '2 hours ago',
      health: 'Fair',
      recommendation: 'Consider increasing water by 10%'
    },
    {
      id: 3,
      zone: 'Garden',
      ndvi: 0.85,
      lastUpdate: '2 hours ago',
      health: 'Excellent',
      recommendation: 'Perfect conditions'
    },
    {
      id: 4,
      zone: 'Side Yard',
      ndvi: 0.45,
      lastUpdate: '2 hours ago',
      health: 'Poor',
      recommendation: 'Increase watering immediately'
    }
  ];

  const getHealthColor = (health) => {
    switch (health.toLowerCase()) {
      case 'excellent': return '#4caf50';
      case 'good': return '#8bc34a';
      case 'fair': return '#ff9800';
      case 'poor': return '#f44336';
      default: return '#757575';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Satellite Analysis
        </Typography>
        <Box>
          <Button 
            startIcon={<Update />} 
            variant="contained" 
            sx={{ mr: 1 }}
          >
            Update Data
          </Button>
          <Button 
            startIcon={<Download />} 
            variant="outlined"
          >
            Download Report
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {satelliteData.map((zone) => (
          <Grid item xs={12} md={6} key={zone.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SatelliteIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h6">{zone.zone}</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Last updated: {zone.lastUpdate}
                    </Typography>
                  </Box>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      NDVI Score
                    </Typography>
                    <Typography variant="h6">
                      {zone.ndvi.toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Health Status
                    </Typography>
                    <Typography variant="h6" sx={{ color: getHealthColor(zone.health) }}>
                      {zone.health}
                    </Typography>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Recommendation
                  </Typography>
                  <Typography>
                    {zone.recommendation}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
