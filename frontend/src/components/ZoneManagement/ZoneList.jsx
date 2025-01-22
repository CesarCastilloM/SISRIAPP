import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Grid,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import ZoneDetails from './ZoneDetails';

const ZoneList = ({ onEditZone }) => {
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [mapCenter, setMapCenter] = useState([51.505, -0.09]);
  const [mapZoom, setMapZoom] = useState(13);

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const response = await fetch('/api/zones');
      if (!response.ok) {
        throw new Error('Failed to fetch zones');
      }
      const data = await response.json();
      setZones(data);

      // Calculate map center based on zones if available
      if (data.length > 0 && data[0].geometry) {
        const firstZone = data[0].geometry.coordinates[0][0];
        setMapCenter([firstZone[1], firstZone[0]]);
      }
    } catch (error) {
      console.error('Error fetching zones:', error);
    }
  };

  const handleDelete = async (zoneId) => {
    if (window.confirm('Are you sure you want to delete this zone?')) {
      try {
        const response = await fetch(`/api/zones/${zoneId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          throw new Error('Failed to delete zone');
        }
        fetchZones();
      } catch (error) {
        console.error('Error deleting zone:', error);
      }
    }
  };

  const handleViewDetails = (zone) => {
    setSelectedZone(zone);
    setShowDetails(true);
  };

  const getPolygonCenter = (coordinates) => {
    if (!coordinates || !coordinates[0] || coordinates[0].length === 0) return null;
    const points = coordinates[0];
    const sumLat = points.reduce((sum, point) => sum + point[1], 0);
    const sumLng = points.reduce((sum, point) => sum + point[0], 0);
    return [sumLat / points.length, sumLng / points.length];
  };

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Zone Management
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <List>
            {zones.map((zone) => (
              <React.Fragment key={zone.id}>
                <ListItem>
                  <ListItemText
                    primary={zone.name}
                    secondary={zone.description || 'No description'}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      aria-label="view"
                      onClick={() => handleViewDetails(zone)}
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      aria-label="edit"
                      onClick={() => onEditZone(zone)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleDelete(zone.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        </Grid>

        <Grid item xs={12} md={7}>
          <Box sx={{ height: 500, width: '100%' }}>
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {zones.map((zone) => {
                if (!zone.geometry || !zone.geometry.coordinates) return null;
                const coordinates = zone.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
                const center = getPolygonCenter(zone.geometry.coordinates);
                
                return (
                  <Polygon
                    key={zone.id}
                    positions={coordinates}
                    pathOptions={{
                      color: selectedZone?.id === zone.id ? '#ff4444' : '#3388ff',
                      fillColor: selectedZone?.id === zone.id ? '#ff8888' : '#3388ff',
                    }}
                    eventHandlers={{
                      click: () => handleViewDetails(zone),
                    }}
                  >
                    <Popup>
                      <Typography variant="subtitle1">{zone.name}</Typography>
                      <Typography variant="body2">{zone.description}</Typography>
                    </Popup>
                  </Polygon>
                );
              })}
            </MapContainer>
          </Box>
        </Grid>
      </Grid>

      <Dialog
        open={showDetails}
        onClose={() => setShowDetails(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Zone Details</DialogTitle>
        <DialogContent>
          {selectedZone && <ZoneDetails zone={selectedZone} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetails(false)}>Close</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setShowDetails(false);
              onEditZone(selectedZone);
            }}
          >
            Edit Zone
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ZoneList;
