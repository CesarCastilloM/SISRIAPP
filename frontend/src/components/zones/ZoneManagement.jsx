import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import axios from 'axios';
import MapSelector from './MapSelector';
import { useSnackbar } from 'notistack';

// Configure axios
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const ZoneManagement = () => {
  const [zones, setZones] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    geometry: null,
  });
  const [error, setError] = useState('');
  const [tempZoneData, setTempZoneData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const fetchZones = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_BASE_URL}/zones`);
      setZones(response.data);
    } catch (err) {
      console.error('Error fetching zones:', err);
      setError('Failed to fetch zones. Please try again later.');
      enqueueSnackbar('Failed to fetch zones', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const handleSave = async () => {
    if (!formData.name || !tempZoneData) {
      setError('Please fill in all required fields and draw a zone on the map.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const zoneData = {
        ...formData,
        geometry: tempZoneData.geometry,
      };

      if (selectedZone) {
        await axios.put(`${API_BASE_URL}/zones/${selectedZone.id}`, zoneData);
        enqueueSnackbar('Zone updated successfully', { variant: 'success' });
      } else {
        const response = await axios.post(`${API_BASE_URL}/zones`, zoneData);
        setZones([...zones, response.data]);
        enqueueSnackbar('Zone created successfully', { variant: 'success' });
      }
      
      handleDialogClose();
      fetchZones();
    } catch (err) {
      console.error('Error saving zone:', err);
      setError('Failed to save zone. Please try again later.');
      enqueueSnackbar('Failed to save zone', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (zoneId) => {
    setLoading(true);
    setError('');
    try {
      await axios.delete(`${API_BASE_URL}/zones/${zoneId}`);
      setZones(zones.filter(zone => zone.id !== zoneId));
      enqueueSnackbar('Zone deleted successfully', { variant: 'success' });
    } catch (err) {
      console.error('Error deleting zone:', err);
      setError('Failed to delete zone. Please try again later.');
      enqueueSnackbar('Failed to delete zone', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (zone) => {
    setSelectedZone(zone);
    setFormData({
      name: zone.name,
      description: zone.description,
      geometry: zone.geometry,
    });
    setTempZoneData({
      geometry: zone.geometry
    });
    setOpen(true);
  };

  const handleDialogClose = () => {
    setOpen(false);
    setSelectedZone(null);
    setFormData({
      name: '',
      description: '',
      geometry: null,
    });
    setTempZoneData(null);
    setError('');
  };

  const handlePolygonSelected = (data) => {
    if (!data) return;
    setTempZoneData(data);
    setFormData(prev => ({
      ...prev,
      geometry: data.geometry
    }));
  };

  if (loading && !open) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h2">
          Irrigation Zones
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setOpen(true)}
          startIcon={<Add />}
          disabled={loading}
        >
          Add Zone
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Dialog 
        open={open}
        onClose={handleDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedZone ? 'Edit Zone' : 'Add New Zone'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Zone Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                error={!formData.name}
                helperText={!formData.name ? 'Name is required' : ''}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ height: 400, width: '100%', position: 'relative' }}>
                <MapSelector
                  onPolygonSelected={handlePolygonSelected}
                  initialGeometry={selectedZone?.geometry}
                />
                {!tempZoneData && (
                  <Typography color="error" sx={{ mt: 1 }}>
                    Please draw a zone on the map
                  </Typography>
                )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            variant="contained" 
            color="primary"
            disabled={!formData.name || !tempZoneData || loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Grid container spacing={2}>
        {zones.map((zone) => (
          <Grid item xs={12} sm={6} md={4} key={zone.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="h3" gutterBottom>
                  {zone.name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {zone.description}
                </Typography>
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  onClick={() => handleEdit(zone)}
                  disabled={loading}
                >
                  Edit
                </Button>
                <Button 
                  size="small" 
                  color="error" 
                  onClick={() => handleDelete(zone.id)}
                  disabled={loading}
                >
                  Delete
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default ZoneManagement;
