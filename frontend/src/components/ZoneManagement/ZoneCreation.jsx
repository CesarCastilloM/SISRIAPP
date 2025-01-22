import React, { useState } from 'react';
import { MapContainer, TileLayer, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Grid,
  Alert,
  Snackbar
} from '@mui/material';

const ZoneCreation = ({ onZoneCreated }) => {
  const [zoneName, setZoneName] = useState('');
  const [description, setDescription] = useState('');
  const [geometry, setGeometry] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleGeometryCreated = (e) => {
    const layer = e.layer;
    setGeometry({
      type: 'Polygon',
      coordinates: [layer.getLatLngs()[0].map(point => [point.lng, point.lat])]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!zoneName || !geometry) {
      setError('Please provide both zone name and draw the zone on the map');
      return;
    }

    try {
      const response = await fetch('/api/zones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: zoneName,
          description,
          geometry
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create zone');
      }

      const data = await response.json();
      setSuccess('Zone created successfully!');
      if (onZoneCreated) {
        onZoneCreated(data);
      }
      
      // Reset form
      setZoneName('');
      setDescription('');
      setGeometry(null);
      
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        Create New Zone
      </Typography>
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Zone Name"
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              required
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={4}
              margin="normal"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ height: 400, width: '100%', mb: 2 }}>
              <MapContainer
                center={[51.505, -0.09]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <FeatureGroup>
                  <EditControl
                    position="topright"
                    onCreated={handleGeometryCreated}
                    draw={{
                      rectangle: false,
                      circle: false,
                      circlemarker: false,
                      marker: false,
                      polyline: false,
                      polygon: true,
                    }}
                  />
                </FeatureGroup>
              </MapContainer>
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              fullWidth
            >
              Create Zone
            </Button>
          </Grid>
        </Grid>
      </form>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
      >
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess('')}
      >
        <Alert severity="success" onClose={() => setSuccess('')}>
          {success}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default ZoneCreation;
