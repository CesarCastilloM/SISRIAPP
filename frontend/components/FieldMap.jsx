import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, LayersControl, Polygon } from 'react-leaflet';
import { useMap } from 'react-leaflet/hooks';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { Box } from '@mui/material';

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
            const bounds = new L.LatLngBounds();
            zones.forEach(zone => {
                if (zone.geometry && zone.geometry.coordinates) {
                    zone.geometry.coordinates[0].forEach(coord => {
                        bounds.extend([coord[1], coord[0]]);
                    });
                }
            });
            if (!bounds.isEmpty()) {
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    }, [map, zones]);
    
    return null;
};

const FieldMap = ({ zones = [], selectedZone, onZoneSelect, editMode = false, onZoneCreated }) => {
    const [map, setMap] = useState(null);
    const [mapType, setMapType] = useState('map');
    const defaultCenter = [19.4326, -99.1332];
    const defaultZoom = 15;

    useEffect(() => {
        if (!map) return;

        if (editMode) {
            // Initialize draw controls
            const drawControl = new L.Control.Draw({
                draw: {
                    marker: false,
                    circlemarker: false,
                    circle: false,
                    rectangle: false,
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
                }
            });

            map.addControl(drawControl);

            const handleDrawCreated = (e) => {
                const layer = e.layer;
                const coordinates = layer.getLatLngs()[0].map(latLng => [latLng.lng, latLng.lat]);
                coordinates.push(coordinates[0]); // Close the polygon
                
                const newZone = {
                    geometry: {
                        type: 'Polygon',
                        coordinates: [coordinates]
                    }
                };

                onZoneCreated && onZoneCreated(newZone);
                
                // Clear the drawn layer
                layer.remove();
            };

            map.on(L.Draw.Event.CREATED, handleDrawCreated);

            return () => {
                map.removeControl(drawControl);
                map.off(L.Draw.Event.CREATED, handleDrawCreated);
            };
        } else {
            // Remove draw control if not in edit mode
            const drawControl = map.drawControl;
            if (drawControl) {
                map.removeControl(drawControl);
            }
        }
    }, [map, editMode, onZoneCreated]);

    const getZoneStyle = (isSelected) => {
        return {
            fillColor: isSelected ? '#2196f3' : '#4caf50',
            weight: isSelected ? 3 : 2,
            opacity: 1,
            color: isSelected ? '#1769aa' : '#357a38',
            fillOpacity: isSelected ? 0.4 : 0.2,
        };
    };

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
                center={defaultCenter}
                zoom={defaultZoom}
                style={{ height: '100%', width: '100%' }}
                whenCreated={setMap}
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
                        />
                    );
                })}
                <MapBoundsUpdater zones={zones} />
            </MapContainer>
        </Box>
    );
};

export default FieldMap;
