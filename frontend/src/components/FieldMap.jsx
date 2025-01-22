import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, LayersControl, Polygon, Popup, FeatureGroup } from 'react-leaflet';
import { useMap } from 'react-leaflet/hooks';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { EditControl } from 'react-leaflet-draw';
import { Box, Typography, Paper } from '@mui/material';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const MapBoundsUpdater = ({ zones }) => {
    const map = useMap();
    
    useEffect(() => {
        if (map && zones && zones.length > 0) {
            try {
                const bounds = L.latLngBounds([]);
                let hasValidBounds = false;
                
                zones.forEach(zone => {
                    if (zone.geometry && zone.geometry.coordinates && zone.geometry.coordinates[0]) {
                        zone.geometry.coordinates[0].forEach(coord => {
                            if (Array.isArray(coord) && coord.length >= 2) {
                                bounds.extend([coord[1], coord[0]]);
                                hasValidBounds = true;
                            }
                        });
                    }
                });

                if (hasValidBounds && bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [50, 50] });
                } else {
                    // Default view if no zones
                    map.setView([19.4326, -99.1332], 15);
                }
            } catch (error) {
                console.error('Error updating map bounds:', error);
                // Default view if error
                map.setView([19.4326, -99.1332], 15);
            }
        } else {
            // Default view if no zones
            map.setView([19.4326, -99.1332], 15);
        }
    }, [map, zones]);
    
    return null;
};

const ZonePopup = ({ zone }) => {
    if (!zone || !zone.properties) return null;

    const {
        soil_moisture,
        soil_temperature,
        soil_ph,
        soil_nutrients,
        air_temperature,
        humidity,
        wind_speed,
        solar_radiation,
        precipitation,
        evapotranspiration,
        name
    } = zone.properties;

    return (
        <Paper elevation={0} style={{ padding: '10px', maxWidth: '300px' }}>
            <Typography variant="h6" gutterBottom>{name || 'Zone Info'}</Typography>
            
            <Typography variant="subtitle2" gutterBottom>Soil Conditions:</Typography>
            <Typography variant="body2">
                • Moisture: {soil_moisture ? `${soil_moisture}%` : 'N/A'}<br />
                • Temperature: {soil_temperature ? `${soil_temperature}°C` : 'N/A'}<br />
                • pH: {soil_ph || 'N/A'}<br />
                • Nutrients: {soil_nutrients ? JSON.stringify(soil_nutrients) : 'N/A'}
            </Typography>

            <Typography variant="subtitle2" gutterBottom style={{ marginTop: '10px' }}>
                Environmental Conditions:
            </Typography>
            <Typography variant="body2">
                • Air Temp: {air_temperature ? `${air_temperature}°C` : 'N/A'}<br />
                • Humidity: {humidity ? `${humidity}%` : 'N/A'}<br />
                • Wind Speed: {wind_speed ? `${wind_speed} m/s` : 'N/A'}<br />
                • Solar Radiation: {solar_radiation ? `${solar_radiation} W/m²` : 'N/A'}<br />
                • Precipitation: {precipitation ? `${precipitation} mm` : 'N/A'}<br />
                • Evapotranspiration: {evapotranspiration ? `${evapotranspiration} mm` : 'N/A'}
            </Typography>
        </Paper>
    );
};

const FieldMap = ({ zones = [], selectedZone, onZoneSelect, editMode = false, onZoneCreated }) => {
    const [mapType, setMapType] = useState('map');
    const featureGroupRef = useRef();

    const handleCreated = (e) => {
        try {
            const layer = e.layer;
            if (!layer || !layer.getLatLngs || !layer.getLatLngs()[0]) {
                console.error('Invalid layer data');
                return;
            }

            const coordinates = layer.getLatLngs()[0].map(latLng => {
                if (!latLng || typeof latLng.lng !== 'number' || typeof latLng.lat !== 'number') {
                    throw new Error('Invalid coordinates');
                }
                return [latLng.lng, latLng.lat];
            });

            // Ensure the polygon is closed
            if (coordinates.length < 3) {
                throw new Error('A polygon must have at least 3 points');
            }
            
            // Close the polygon if not already closed
            if (JSON.stringify(coordinates[0]) !== JSON.stringify(coordinates[coordinates.length - 1])) {
                coordinates.push(coordinates[0]);
            }
            
            console.log('Drawing coordinates:', coordinates);
            
            const newZone = {
                geometry: {
                    type: 'Polygon',
                    coordinates: [coordinates]
                }
            };

            console.log('Created zone data:', newZone);
            onZoneCreated && onZoneCreated(newZone);
            
            // Remove the drawn layer as it will be added back when the zones state updates
            if (featureGroupRef.current) {
                featureGroupRef.current.clearLayers();
            }
        } catch (error) {
            console.error('Error creating zone:', error);
            // You might want to show this error to the user through a UI component
        }
    };

    const getZoneStyle = (isSelected) => ({
        fillColor: isSelected ? '#2196f3' : '#4caf50',
        weight: isSelected ? 3 : 2,
        opacity: 1,
        color: isSelected ? '#1769aa' : '#357a38',
        fillOpacity: isSelected ? 0.4 : 0.2,
    });

    return (
        <Box sx={{ 
            height: '100%', 
            minHeight: '400px',
            width: '100%',
            '& .leaflet-container': {
                height: '100%',
                width: '100%',
                borderRadius: 1,
            }
        }}>
            <MapContainer
                center={[19.4326, -99.1332]}
                zoom={15}
                style={{ height: '100%', width: '100%' }}
            >
                <LayersControl position="topright">
                    <LayersControl.BaseLayer 
                        checked={mapType === 'map'} 
                        name="OpenStreetMap"
                        onChange={() => setMapType('map')}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer 
                        checked={mapType === 'satellite'} 
                        name="Satellite"
                        onChange={() => setMapType('satellite')}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.esri.com">Esri</a>'
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        />
                    </LayersControl.BaseLayer>
                </LayersControl>

                <FeatureGroup ref={featureGroupRef}>
                    {editMode && (
                        <EditControl
                            position='topright'
                            onCreated={handleCreated}
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
                                        message: '<strong>Error:</strong> Polygon edges cannot cross!'
                                    },
                                    shapeOptions: {
                                        color: '#4caf50'
                                    }
                                }
                            }}
                            edit={{
                                edit: false,
                                remove: false
                            }}
                        />
                    )}
                </FeatureGroup>

                {zones.map((zone, index) => {
                    if (!zone.geometry || !zone.geometry.coordinates) return null;
                    
                    const coordinates = zone.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
                    const isSelected = index === selectedZone;

                    return (
                        <Polygon
                            key={zone.id || index}
                            positions={coordinates}
                            pathOptions={getZoneStyle(isSelected)}
                            eventHandlers={{
                                click: () => onZoneSelect(index)
                            }}
                        >
                            <Popup>
                                <ZonePopup zone={zone} />
                            </Popup>
                        </Polygon>
                    );
                })}
                <MapBoundsUpdater zones={zones} />
            </MapContainer>
        </Box>
    );
};

export default FieldMap;
