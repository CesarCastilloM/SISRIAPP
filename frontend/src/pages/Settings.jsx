import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Notifications,
  Email,
  Phone,
  Save,
  Delete,
  Edit,
  Add,
  CloudUpload,
  CloudDownload,
} from '@mui/icons-material';

const Settings = () => {
  const [generalSettings, setGeneralSettings] = useState({
    systemName: 'SISRI Smart Irrigation',
    timezone: 'America/Denver',
    language: 'en',
    units: 'metric',
    dataRetention: 90,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    alertThresholds: {
      lowMoisture: 20,
      highMoisture: 80,
      lowPressure: 30,
      highPressure: 60,
    },
    recipients: [
      { id: 1, type: 'email', value: 'admin@example.com' },
      { id: 2, type: 'phone', value: '+1234567890' },
    ],
  });

  const [weatherSettings, setWeatherSettings] = useState({
    provider: 'openweathermap',
    apiKey: '************************',
    updateInterval: 30,
    forecastDays: 5,
  });

  const [irrigationDefaults, setIrrigationDefaults] = useState({
    defaultDuration: 20,
    defaultIntensity: 75,
    minimumMoisture: 30,
    maximumMoisture: 70,
    pressureRange: {
      min: 30,
      max: 60,
    },
  });

  const [backupSettings, setBackupSettings] = useState({
    autoBackup: true,
    backupInterval: 'daily',
    backupLocation: 'cloud',
    retentionPeriod: 30,
  });

  const [addRecipientOpen, setAddRecipientOpen] = useState(false);
  const [newRecipient, setNewRecipient] = useState({ type: 'email', value: '' });

  const handleSaveGeneral = () => {
    // API call to save general settings
    console.log('Saving general settings:', generalSettings);
  };

  const handleSaveNotifications = () => {
    // API call to save notification settings
    console.log('Saving notification settings:', notificationSettings);
  };

  const handleSaveWeather = () => {
    // API call to save weather settings
    console.log('Saving weather settings:', weatherSettings);
  };

  const handleSaveIrrigation = () => {
    // API call to save irrigation defaults
    console.log('Saving irrigation defaults:', irrigationDefaults);
  };

  const handleSaveBackup = () => {
    // API call to save backup settings
    console.log('Saving backup settings:', backupSettings);
  };

  const handleAddRecipient = () => {
    if (newRecipient.value) {
      setNotificationSettings(prev => ({
        ...prev,
        recipients: [
          ...prev.recipients,
          { id: Date.now(), ...newRecipient }
        ],
      }));
      setAddRecipientOpen(false);
      setNewRecipient({ type: 'email', value: '' });
    }
  };

  const handleDeleteRecipient = (id) => {
    setNotificationSettings(prev => ({
      ...prev,
      recipients: prev.recipients.filter(r => r.id !== id),
    }));
  };

  const handleBackupNow = () => {
    // API call to trigger immediate backup
    console.log('Triggering immediate backup');
  };

  const handleRestoreBackup = () => {
    // API call to restore from backup
    console.log('Initiating backup restoration');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        System Settings
      </Typography>

      <Grid container spacing={3}>
        {/* General Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                General Settings
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="System Name"
                    value={generalSettings.systemName}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, systemName: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Timezone</InputLabel>
                    <Select
                      value={generalSettings.timezone}
                      label="Timezone"
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, timezone: e.target.value }))}
                    >
                      <MenuItem value="America/Denver">Mountain Time (MT)</MenuItem>
                      <MenuItem value="America/Chicago">Central Time (CT)</MenuItem>
                      <MenuItem value="America/New_York">Eastern Time (ET)</MenuItem>
                      <MenuItem value="America/Los_Angeles">Pacific Time (PT)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Units</InputLabel>
                    <Select
                      value={generalSettings.units}
                      label="Units"
                      onChange={(e) => setGeneralSettings(prev => ({ ...prev, units: e.target.value }))}
                    >
                      <MenuItem value="metric">Metric</MenuItem>
                      <MenuItem value="imperial">Imperial</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Data Retention (days)"
                    value={generalSettings.dataRetention}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, dataRetention: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    onClick={handleSaveGeneral}
                    startIcon={<Save />}
                  >
                    Save Changes
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Notification Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Notification Settings
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notificationSettings.emailNotifications}
                        onChange={(e) => setNotificationSettings(prev => ({
                          ...prev,
                          emailNotifications: e.target.checked
                        }))}
                      />
                    }
                    label="Email Notifications"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notificationSettings.smsNotifications}
                        onChange={(e) => setNotificationSettings(prev => ({
                          ...prev,
                          smsNotifications: e.target.checked
                        }))}
                      />
                    }
                    label="SMS Notifications"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Alert Thresholds
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Low Moisture (%)"
                        type="number"
                        value={notificationSettings.alertThresholds.lowMoisture}
                        onChange={(e) => setNotificationSettings(prev => ({
                          ...prev,
                          alertThresholds: {
                            ...prev.alertThresholds,
                            lowMoisture: e.target.value
                          }
                        }))}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="High Moisture (%)"
                        type="number"
                        value={notificationSettings.alertThresholds.highMoisture}
                        onChange={(e) => setNotificationSettings(prev => ({
                          ...prev,
                          alertThresholds: {
                            ...prev.alertThresholds,
                            highMoisture: e.target.value
                          }
                        }))}
                      />
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Recipients
                  </Typography>
                  <List>
                    {notificationSettings.recipients.map((recipient) => (
                      <ListItem key={recipient.id}>
                        <ListItemText
                          primary={recipient.value}
                          secondary={recipient.type}
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            edge="end"
                            onClick={() => handleDeleteRecipient(recipient.id)}
                          >
                            <Delete />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                  <Button
                    startIcon={<Add />}
                    onClick={() => setAddRecipientOpen(true)}
                  >
                    Add Recipient
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    onClick={handleSaveNotifications}
                    startIcon={<Save />}
                  >
                    Save Changes
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Weather Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Weather Integration
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Weather Provider</InputLabel>
                    <Select
                      value={weatherSettings.provider}
                      label="Weather Provider"
                      onChange={(e) => setWeatherSettings(prev => ({ ...prev, provider: e.target.value }))}
                    >
                      <MenuItem value="openweathermap">OpenWeatherMap</MenuItem>
                      <MenuItem value="weatherapi">WeatherAPI</MenuItem>
                      <MenuItem value="accuweather">AccuWeather</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="API Key"
                    type="password"
                    value={weatherSettings.apiKey}
                    onChange={(e) => setWeatherSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Update Interval (minutes)"
                    type="number"
                    value={weatherSettings.updateInterval}
                    onChange={(e) => setWeatherSettings(prev => ({ ...prev, updateInterval: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Forecast Days"
                    type="number"
                    value={weatherSettings.forecastDays}
                    onChange={(e) => setWeatherSettings(prev => ({ ...prev, forecastDays: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    onClick={handleSaveWeather}
                    startIcon={<Save />}
                  >
                    Save Changes
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Irrigation Defaults */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Irrigation Defaults
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Default Duration (minutes)"
                    type="number"
                    value={irrigationDefaults.defaultDuration}
                    onChange={(e) => setIrrigationDefaults(prev => ({ ...prev, defaultDuration: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Default Intensity (%)"
                    type="number"
                    value={irrigationDefaults.defaultIntensity}
                    onChange={(e) => setIrrigationDefaults(prev => ({ ...prev, defaultIntensity: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Minimum Moisture (%)"
                    type="number"
                    value={irrigationDefaults.minimumMoisture}
                    onChange={(e) => setIrrigationDefaults(prev => ({ ...prev, minimumMoisture: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Maximum Moisture (%)"
                    type="number"
                    value={irrigationDefaults.maximumMoisture}
                    onChange={(e) => setIrrigationDefaults(prev => ({ ...prev, maximumMoisture: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Pressure Range
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Minimum (PSI)"
                        type="number"
                        value={irrigationDefaults.pressureRange.min}
                        onChange={(e) => setIrrigationDefaults(prev => ({
                          ...prev,
                          pressureRange: { ...prev.pressureRange, min: e.target.value }
                        }))}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Maximum (PSI)"
                        type="number"
                        value={irrigationDefaults.pressureRange.max}
                        onChange={(e) => setIrrigationDefaults(prev => ({
                          ...prev,
                          pressureRange: { ...prev.pressureRange, max: e.target.value }
                        }))}
                      />
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    onClick={handleSaveIrrigation}
                    startIcon={<Save />}
                  >
                    Save Changes
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Backup & Restore */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Backup & Restore
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={backupSettings.autoBackup}
                        onChange={(e) => setBackupSettings(prev => ({
                          ...prev,
                          autoBackup: e.target.checked
                        }))}
                      />
                    }
                    label="Automatic Backups"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Backup Interval</InputLabel>
                    <Select
                      value={backupSettings.backupInterval}
                      label="Backup Interval"
                      onChange={(e) => setBackupSettings(prev => ({ ...prev, backupInterval: e.target.value }))}
                    >
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Backup Location</InputLabel>
                    <Select
                      value={backupSettings.backupLocation}
                      label="Backup Location"
                      onChange={(e) => setBackupSettings(prev => ({ ...prev, backupLocation: e.target.value }))}
                    >
                      <MenuItem value="local">Local Storage</MenuItem>
                      <MenuItem value="cloud">Cloud Storage</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Retention Period (days)"
                    type="number"
                    value={backupSettings.retentionPeriod}
                    onChange={(e) => setBackupSettings(prev => ({ ...prev, retentionPeriod: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Box display="flex" gap={2}>
                    <Button
                      variant="contained"
                      onClick={handleBackupNow}
                      startIcon={<CloudUpload />}
                    >
                      Backup Now
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleRestoreBackup}
                      startIcon={<CloudDownload />}
                    >
                      Restore from Backup
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleSaveBackup}
                      startIcon={<Save />}
                    >
                      Save Settings
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Add Recipient Dialog */}
      <Dialog open={addRecipientOpen} onClose={() => setAddRecipientOpen(false)}>
        <DialogTitle>Add Notification Recipient</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={newRecipient.type}
                  label="Type"
                  onChange={(e) => setNewRecipient(prev => ({ ...prev, type: e.target.value }))}
                >
                  <MenuItem value="email">Email</MenuItem>
                  <MenuItem value="phone">Phone</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={newRecipient.type === 'email' ? 'Email Address' : 'Phone Number'}
                value={newRecipient.value}
                onChange={(e) => setNewRecipient(prev => ({ ...prev, value: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddRecipientOpen(false)}>Cancel</Button>
          <Button onClick={handleAddRecipient} variant="contained">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Settings;
