import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Slider,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Alert,
  Divider,
  Chip,
} from '@mui/material';
import {
  WaterDrop,
  Schedule,
  Settings,
  PlayArrow,
  Stop,
  Edit,
  Delete,
  Add,
} from '@mui/icons-material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';

const Irrigation = () => {
  const [selectedZone, setSelectedZone] = useState(1);
  const [schedules, setSchedules] = useState([
    {
      id: 1,
      zoneId: 1,
      startTime: '06:00',
      duration: 20,
      days: ['Mon', 'Wed', 'Fri'],
      active: true,
      moistureThreshold: 30,
    },
    {
      id: 2,
      zoneId: 1,
      startTime: '18:00',
      duration: 15,
      days: ['Tue', 'Thu', 'Sat'],
      active: true,
      moistureThreshold: 35,
    },
  ]);

  const [manualControls, setManualControls] = useState({
    duration: 15,
    intensity: 75,
  });

  const [activeZones, setActiveZones] = useState([]);
  const [editingSchedule, setEditingSchedule] = useState(null);

  const mockZoneStatus = {
    1: {
      name: 'Zone 1',
      status: 'idle',
      moisture: 45,
      lastIrrigation: '2023-12-26 14:30',
      flowRate: 2.5,
      pressure: 45,
      nextScheduled: '2023-12-27 06:00',
    },
    2: {
      name: 'Zone 2',
      status: 'running',
      moisture: 38,
      lastIrrigation: '2023-12-26 16:15',
      flowRate: 2.8,
      pressure: 43,
      nextScheduled: '2023-12-27 18:00',
    },
  };

  const handleStartManualIrrigation = (zoneId) => {
    setActiveZones([...activeZones, zoneId]);
    // API call to start irrigation
  };

  const handleStopIrrigation = (zoneId) => {
    setActiveZones(activeZones.filter(id => id !== zoneId));
    // API call to stop irrigation
  };

  const handleScheduleChange = (scheduleId, field, value) => {
    setSchedules(schedules.map(schedule => 
      schedule.id === scheduleId ? { ...schedule, [field]: value } : schedule
    ));
  };

  const renderZoneStatus = (zoneId) => {
    const zone = mockZoneStatus[zoneId];
    const isActive = activeZones.includes(zoneId);

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">{zone.name}</Typography>
                <Chip
                  label={zone.status}
                  color={zone.status === 'running' ? 'success' : 'default'}
                />
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Soil Moisture
                </Typography>
                <Typography variant="h5">
                  {zone.moisture}%
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Flow Rate
                </Typography>
                <Typography variant="h5">
                  {zone.flowRate} L/min
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            <Grid item xs={12}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Manual Control
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={6}>
                    <Typography>Duration (min)</Typography>
                    <Slider
                      value={manualControls.duration}
                      onChange={(e, value) => setManualControls({ ...manualControls, duration: value })}
                      min={1}
                      max={60}
                      valueLabelDisplay="auto"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography>Intensity (%)</Typography>
                    <Slider
                      value={manualControls.intensity}
                      onChange={(e, value) => setManualControls({ ...manualControls, intensity: value })}
                      min={10}
                      max={100}
                      valueLabelDisplay="auto"
                    />
                  </Grid>
                </Grid>
                <Box sx={{ mt: 2 }}>
                  {!isActive ? (
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<PlayArrow />}
                      onClick={() => handleStartManualIrrigation(zoneId)}
                      fullWidth
                    >
                      Start Irrigation
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<Stop />}
                      onClick={() => handleStopIrrigation(zoneId)}
                      fullWidth
                    >
                      Stop Irrigation
                    </Button>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  const renderSchedules = () => (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Irrigation Schedules</Typography>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => setEditingSchedule({})}
          >
            Add Schedule
          </Button>
        </Box>

        {schedules.filter(s => s.zoneId === selectedZone).map((schedule) => (
          <Box
            key={schedule.id}
            sx={{
              p: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              mb: 2,
            }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <Typography variant="subtitle2">Start Time</Typography>
                <Typography>{schedule.startTime}</Typography>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Typography variant="subtitle2">Duration</Typography>
                <Typography>{schedule.duration} min</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2">Days</Typography>
                <Box display="flex" gap={0.5}>
                  {schedule.days.map(day => (
                    <Chip key={day} label={day} size="small" />
                  ))}
                </Box>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Box display="flex" gap={1}>
                  <IconButton
                    size="small"
                    onClick={() => setEditingSchedule(schedule)}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => {
                      setSchedules(schedules.filter(s => s.id !== schedule.id));
                    }}
                  >
                    <Delete />
                  </IconButton>
                  <Switch
                    checked={schedule.active}
                    onChange={(e) => handleScheduleChange(schedule.id, 'active', e.target.checked)}
                    size="small"
                  />
                </Box>
              </Grid>
            </Grid>
          </Box>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Irrigation Management
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Zone Selection
              </Typography>
              <Select
                fullWidth
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
              >
                {Object.keys(mockZoneStatus).map((zoneId) => (
                  <MenuItem key={zoneId} value={Number(zoneId)}>
                    {mockZoneStatus[zoneId].name}
                  </MenuItem>
                ))}
              </Select>
            </CardContent>
          </Card>

          {renderZoneStatus(selectedZone)}
        </Grid>

        <Grid item xs={12} md={8}>
          {renderSchedules()}
        </Grid>
      </Grid>
    </Box>
  );
};

export default Irrigation;
