import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Card,
  CardContent,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Slider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  WaterDrop,
  Schedule,
} from '@mui/icons-material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';
import { useSnackbar } from 'notistack';

const API_BASEURL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const IrrigationManagement = () => {
  const [manualMode, setManualMode] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [selectedZone, setSelectedZone] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    zoneId: '',
    startTime: new Date(),
    duration: 30,
    daysOfWeek: [],
    mode: 'automatic'
  });
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchZones();
    fetchSchedules();
  }, []);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASEURL}/zones`);
      setZones(response.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching zones:', err);
      setError('Failed to fetch zones. Please try again later.');
      enqueueSnackbar('Failed to fetch zones', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async () => {
    try {
      const response = await axios.get(`${API_BASEURL}/irrigation/schedules`);
      setSchedules(response.data);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const handleModeChange = (event) => {
    setManualMode(event.target.checked);
  };

  const handleIrrigation = async (zoneId) => {
    try {
      await axios.post(`${API_BASEURL}/irrigation/start`, { zone_id: zoneId });
      enqueueSnackbar('Irrigation started successfully', { variant: 'success' });
    } catch (err) {
      console.error('Error starting irrigation:', err);
      enqueueSnackbar('Failed to start irrigation', { variant: 'error' });
    }
  };

  const handleDialogOpen = (schedule = null) => {
    if (schedule) {
      setScheduleData(schedule);
    } else {
      setScheduleData({
        zoneId: '',
        startTime: new Date(),
        duration: 30,
        daysOfWeek: [],
        mode: 'automatic'
      });
    }
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleSave = async () => {
    try {
      if (scheduleData.id) {
        await axios.put(`${API_BASEURL}/irrigation/schedules/${scheduleData.id}`, scheduleData);
      } else {
        await axios.post(`${API_BASEURL}/irrigation/schedules`, scheduleData);
      }
      fetchSchedules();
      handleDialogClose();
    } catch (error) {
      console.error('Error saving schedule:', error);
    }
  };

  const handleDelete = async (scheduleId) => {
    try {
      await axios.delete(`${API_BASEURL}/irrigation/schedules/${scheduleId}`);
      fetchSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="mobile-card">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Irrigation Control</Typography>
        <FormControlLabel
          control={
            <Switch
              checked={manualMode}
              onChange={handleModeChange}
              name="manualMode"
              color="primary"
            />
          }
          label={manualMode ? "Manual" : "Scheduled"}
        />
      </Box>

      {/* Zone Cards */}
      {zones.map((zone) => (
        <Card key={zone.id} className="stats-card" sx={{ mb: 2 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="subtitle1">{zone.name}</Typography>
                <Typography variant="body2" color="textSecondary">
                  Moisture: {zone.moisture}%
                </Typography>
              </Box>
              <IconButton
                color="primary"
                onClick={() => handleIrrigation(zone.id)}
                aria-label={`Start irrigation for ${zone.name}`}
              >
                <WaterDrop />
              </IconButton>
            </Box>
          </CardContent>
        </Card>
      ))}

      {/* Schedules Section */}
      <Box mt={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Schedules</Typography>
          <IconButton
            color="primary"
            onClick={() => handleDialogOpen()}
            aria-label="Add new schedule"
          >
            <AddIcon />
          </IconButton>
        </Box>

        <List>
          {schedules.map((schedule) => (
            <ListItem
              key={schedule.id}
              className="mobile-card"
              sx={{ mb: 1 }}
            >
              <ListItemText
                primary={zones.find(z => z.id === schedule.zoneId)?.name}
                secondary={`${new Date(schedule.startTime).toLocaleTimeString()} - ${schedule.duration} min`}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  aria-label="edit"
                  onClick={() => handleDialogOpen(schedule)}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() => handleDelete(schedule.id)}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Schedule Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} fullWidth maxWidth="sm">
        <DialogTitle>
          {scheduleData.id ? 'Edit Schedule' : 'New Schedule'}
        </DialogTitle>
        <DialogContent>
          <Box py={2}>
            <TextField
              fullWidth
              select
              label="Zone"
              value={scheduleData.zoneId}
              onChange={(e) => setScheduleData({ ...scheduleData, zoneId: e.target.value })}
              margin="normal"
            >
              {zones.map((zone) => (
                <MenuItem key={zone.id} value={zone.id}>
                  {zone.name}
                </MenuItem>
              ))}
            </TextField>

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <TimePicker
                label="Start Time"
                value={scheduleData.startTime}
                onChange={(newValue) => setScheduleData({ ...scheduleData, startTime: newValue })}
                renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
              />
            </LocalizationProvider>

            <Box mt={2}>
              <Typography gutterBottom>Duration (minutes)</Typography>
              <Slider
                value={scheduleData.duration}
                onChange={(e, newValue) => setScheduleData({ ...scheduleData, duration: newValue })}
                min={5}
                max={120}
                step={5}
                marks
                valueLabelDisplay="auto"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IrrigationManagement;
