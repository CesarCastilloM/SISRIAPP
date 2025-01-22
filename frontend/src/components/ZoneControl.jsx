import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Grid,
  Slider,
  Switch,
  FormControlLabel,
  Alert,
} from '@mui/material';
import { WaterDrop, Timer, Warning } from '@mui/icons-material';

const ZoneControl = ({ zones = [], selectedZone = 0, onZoneSelect, serverConnected, arduinoConnected }) => {
  const [irrigationDuration, setIrrigationDuration] = useState(15);

  const handleManualIrrigation = async (zoneId, duration) => {
    if (!serverConnected || !arduinoConnected) {
      console.error('System offline');
      return;
    }

    try {
      await fetch('/api/irrigate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ zoneId, duration }),
      });
    } catch (error) {
      console.error('Failed to start irrigation:', error);
    }
  };

  const handleModeChange = async (zoneId, automatic) => {
    if (!serverConnected) {
      console.error('Server offline');
      return;
    }

    try {
      await fetch('/api/zone/mode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ zoneId, automatic }),
      });
    } catch (error) {
      console.error('Failed to change mode:', error);
    }
  };

  if (!serverConnected || !arduinoConnected) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            System is offline. Please check your connections.
          </Alert>
          <Typography variant="h6" gutterBottom>
            Zone Controls
          </Typography>
          <Typography color="text.secondary">
            Controls are disabled until the system is online.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Zone Controls
        </Typography>
        
        {zones.map((zone, index) => (
          <Box
            key={zone?.id || index}
            sx={{
              mb: 2,
              p: 2,
              border: index === selectedZone ? '2px solid #2196f3' : '1px solid #e0e0e0',
              borderRadius: 1,
              cursor: 'pointer',
              bgcolor: zone?.status === 'offline' ? 'action.disabledBackground' : 'background.paper',
            }}
            onClick={() => onZoneSelect(index)}
          >
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Zone {zone?.id || index + 1}: {zone?.name || 'Unnamed Zone'}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Box display="flex" alignItems="center">
                  <WaterDrop color="primary" sx={{ mr: 1 }} />
                  <Typography>
                    Moisture: {zone?.moisture || '--'}%
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={6}>
                <Box display="flex" alignItems="center">
                  <Timer color="info" sx={{ mr: 1 }} />
                  <Typography>
                    Last: {zone?.lastIrrigation || 'Never'}
                  </Typography>
                </Box>
              </Grid>

              {zone?.alerts && (
                <Grid item xs={12}>
                  <Box display="flex" alignItems="center" sx={{ color: 'warning.main' }}>
                    <Warning sx={{ mr: 1 }} />
                    <Typography color="warning.main">
                      {zone.alerts}
                    </Typography>
                  </Box>
                </Grid>
              )}

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={zone?.automatic || false}
                      onChange={(e) => handleModeChange(zone?.id, e.target.checked)}
                      color="primary"
                      disabled={zone?.status === 'offline'}
                    />
                  }
                  label="Automatic Mode"
                />
              </Grid>

              {!(zone?.automatic) && (
                <>
                  <Grid item xs={12}>
                    <Typography gutterBottom>
                      Duration (minutes)
                    </Typography>
                    <Slider
                      value={irrigationDuration}
                      onChange={(e, value) => setIrrigationDuration(value)}
                      min={1}
                      max={60}
                      valueLabelDisplay="auto"
                      marks={[
                        { value: 1, label: '1m' },
                        { value: 30, label: '30m' },
                        { value: 60, label: '60m' },
                      ]}
                      disabled={zone?.status === 'offline'}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<WaterDrop />}
                      onClick={() => handleManualIrrigation(zone?.id, irrigationDuration)}
                      fullWidth
                      disabled={zone?.status === 'offline'}
                    >
                      Start Irrigation
                    </Button>
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        ))}
      </CardContent>
    </Card>
  );
};

export default ZoneControl;
