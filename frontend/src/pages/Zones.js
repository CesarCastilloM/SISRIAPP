import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  Typography,
  IconButton,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

export default function Zones() {
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawnPolygon, setDrawnPolygon] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cropType: '',
    irrigationType: '',
    area: '',
    geometry: null
  });

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const response = await fetch('/api/zones');
      const data = await response.json();
      setZones(data);
      setError('');
    } catch (err) {
      setError('Failed to fetch zones');
      console.error('Error fetching zones:', err);
    }
  };

  const handleCreateZone = async () => {
    try {
      if (!formData.geometry) {
        setError('Please draw the zone boundaries on the map');
        return;
      }

      const response = await fetch('/api/zones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to create zone');

      setSuccess('Zone created successfully');
      setIsCreating(false);
      setFormData({
        name: '',
        description: '',
        cropType: '',
        irrigationType: '',
        area: '',
        geometry: null
      });
      fetchZones();
    } catch (err) {
      setError('Failed to create zone');
      console.error('Error creating zone:', err);
    }
  };

  const handleUpdateZone = async () => {
    try {
      const response = await fetch(`/api/zones/${selectedZone.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to update zone');

      setSuccess('Zone updated successfully');
      setIsEditing(false);
      fetchZones();
    } catch (err) {
      setError('Failed to update zone');
      console.error('Error updating zone:', err);
    }
  };

  const handleDeleteZone = async (zoneId) => {
    if (!window.confirm('Are you sure you want to delete this zone?')) return;

    try {
      const response = await fetch(`/api/zones/${zoneId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete zone');

      setSuccess('Zone deleted successfully');
      setSelectedZone(null);
      fetchZones();
    } catch (err) {
      setError('Failed to delete zone');
      console.error('Error deleting zone:', err);
    }
  };

  const MapDrawingTools = () => {
    const map = useMap();
    
    useEffect(() => {
      if (!map) return;

      // Initialize drawing controls
      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);

      const drawControl = new L.Control.Draw({
        draw: {
          polygon: true,
          rectangle: true,
          circle: false,
          circlemarker: false,
          marker: false,
          polyline: false,
        },
        edit: {
          featureGroup: drawnItems,
        },
      });

      map.addControl(drawControl);

      map.on(L.Draw.Event.CREATED, (e) => {
        const layer = e.layer;
        drawnItems.addLayer(layer);
        setFormData(prev => ({
          ...prev,
          geometry: layer.toGeoJSON()
        }));
      });

      return () => {
        map.removeControl(drawControl);
        map.removeLayer(drawnItems);
      };
    }, [map]);

    return null;
  };

  return (
    <Box sx={{ p: 3 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Grid container spacing={3}>
        {/* Zone List */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Zones</Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setIsCreating(true)}
                >
                  Add Zone
                </Button>
              </Box>

              {zones.map((zone) => (
                <Card
                  key={zone.id}
                  sx={{
                    mb: 1,
                    cursor: 'pointer',
                    bgcolor: selectedZone?.id === zone.id ? 'action.selected' : 'background.paper',
                  }}
                  onClick={() => setSelectedZone(zone)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1">{zone.name}</Typography>
                      <Box>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsEditing(true);
                            setFormData(zone);
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteZone(zone.id);
                          }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {zone.description}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Map */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '600px' }}>
            <MapContainer
              center={[51.505, -0.09]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {drawingMode && <MapDrawingTools />}
              {zones.map((zone) => (
                zone.geometry && (
                  <Polygon
                    key={zone.id}
                    positions={zone.geometry.coordinates[0]}
                    pathOptions={{
                      color: selectedZone?.id === zone.id ? '#2196f3' : '#4caf50',
                      weight: 2,
                    }}
                  />
                )
              ))}
            </MapContainer>
          </Card>
        </Grid>
      </Grid>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreating || isEditing}
        onClose={() => {
          setIsCreating(false);
          setIsEditing(false);
          setFormData({
            name: '',
            description: '',
            cropType: '',
            irrigationType: '',
            area: '',
            geometry: null
          });
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {isCreating ? 'Create New Zone' : 'Edit Zone'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Crop Type</InputLabel>
              <Select
                value={formData.cropType}
                onChange={(e) => setFormData({ ...formData, cropType: e.target.value })}
                label="Crop Type"
              >
                <MenuItem value="corn">Corn</MenuItem>
                <MenuItem value="wheat">Wheat</MenuItem>
                <MenuItem value="soybean">Soybean</MenuItem>
                <MenuItem value="cotton">Cotton</MenuItem>
                <MenuItem value="vegetables">Vegetables</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Irrigation Type</InputLabel>
              <Select
                value={formData.irrigationType}
                onChange={(e) => setFormData({ ...formData, irrigationType: e.target.value })}
                label="Irrigation Type"
              >
                <MenuItem value="drip">Drip Irrigation</MenuItem>
                <MenuItem value="sprinkler">Sprinkler System</MenuItem>
                <MenuItem value="flood">Flood Irrigation</MenuItem>
                <MenuItem value="center-pivot">Center Pivot</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Area (hectares)"
              type="number"
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              sx={{ mb: 2 }}
            />
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setDrawingMode(!drawingMode)}
              sx={{ mb: 2 }}
            >
              {drawingMode ? 'Finish Drawing' : 'Draw Zone on Map'}
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setIsCreating(false);
              setIsEditing(false);
              setFormData({
                name: '',
                description: '',
                cropType: '',
                irrigationType: '',
                area: '',
                geometry: null
              });
            }}
            startIcon={<CancelIcon />}
          >
            Cancel
          </Button>
          <Button
            onClick={isCreating ? handleCreateZone : handleUpdateZone}
            variant="contained"
            startIcon={<SaveIcon />}
          >
            {isCreating ? 'Create' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
