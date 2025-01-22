import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, CircularProgress, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { MapContainer, TileLayer, FeatureGroup, LayersControl } from 'react-leaflet';
import { EditControl } from "react-leaflet-draw";
import * as L from 'leaflet';
import { Map as MapIcon, Satellite } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

// Fix leaflet's default icon path issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: require('leaflet/dist/images/marker-icon.png').default,
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png').default,
  shadowUrl: require('leaflet/dist/images/marker-shadow.png').default,
});

const MapSelector = ({ onPolygonSelected, initialGeometry = null }) => {
  const [loading, setLoading] = useState(false);
  const [map, setMap] = useState(null);
  const [mapType, setMapType] = useState('street');
  const featureGroupRef = useRef();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (map && initialGeometry && featureGroupRef.current) {
      try {
        featureGroupRef.current.clearLayers();
        const layer = L.geoJSON(initialGeometry);
        featureGroupRef.current.addLayer(layer);
        map.fitBounds(layer.getBounds());
      } catch (error) {
        console.error('Error setting initial geometry:', error);
        enqueueSnackbar('Error loading initial area', { variant: 'error' });
      }
    }
  }, [map, initialGeometry, enqueueSnackbar]);

  const handleMapTypeChange = (event, newType) => {
    if (newType !== null) {
      setMapType(newType);
    }
  };

  const onDrawCreate = async (e) => {
    if (!e || !e.layer) return;
    
    setLoading(true);
    try {
      const layer = e.layer;
      const geoJSON = layer.toGeoJSON();
      
      if (onPolygonSelected && typeof onPolygonSelected === 'function') {
        onPolygonSelected({
          geometry: geoJSON.geometry,
          location: {
            address: 'Custom Zone',
            city: '',
            state: '',
            country: ''
          }
        });
        enqueueSnackbar('Area selected successfully', { variant: 'success' });
      }
    } catch (error) {
      console.error('Error processing zone data:', error);
      enqueueSnackbar('Error processing zone data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box 
      sx={{ 
        height: 400, 
        width: '100%', 
        position: 'relative',
        '& .leaflet-container': {
          height: '100%',
          width: '100%',
          zIndex: 1
        }
      }}
    >
      <Box sx={{ 
        position: 'absolute', 
        top: 10, 
        right: 10, 
        zIndex: 1000, 
        backgroundColor: 'white', 
        borderRadius: 1, 
        p: 0.5,
        boxShadow: 1
      }}>
        <ToggleButtonGroup
          value={mapType}
          exclusive
          onChange={handleMapTypeChange}
          size="small"
        >
          <ToggleButton value="street" aria-label="street map">
            <MapIcon />
          </ToggleButton>
          <ToggleButton value="satellite" aria-label="satellite">
            <Satellite />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <MapContainer
        center={[19.4326, -99.1332]}
        zoom={13}
        whenCreated={setMap}
        style={{ height: '100%', width: '100%' }}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked={mapType === 'street'} name="Street Map">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
          </LayersControl.BaseLayer>

          <LayersControl.BaseLayer checked={mapType === 'satellite'} name="Satellite">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        <FeatureGroup ref={featureGroupRef}>
          <EditControl
            position="topright"
            onCreated={onDrawCreate}
            draw={{
              rectangle: false,
              circle: false,
              circlemarker: false,
              marker: false,
              polyline: false,
              polygon: {
                allowIntersection: false,
                drawError: {
                  color: '#e1e100',
                  message: '<strong>Cannot draw intersecting lines!</strong>'
                },
                shapeOptions: {
                  color: '#2196f3'
                }
              }
            }}
            edit={{
              remove: false,
              edit: false
            }}
          />
        </FeatureGroup>
      </MapContainer>

      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            zIndex: 1000,
          }}
        >
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
};

export default MapSelector;
