import React, { useState, useCallback, useEffect } from 'react';
import { Box, Button, CircularProgress, Typography, Grid } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import FieldMap from '../components/FieldMap';
import DataCarousel from '../components/DataCarousel';
import { API_BASE_URL } from '../config';
import '../styles/FieldManagement.css';

const FieldManagement = () => {
    const [zones, setZones] = useState([]);
    const [selectedZone, setSelectedZone] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchZones = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/zones`);
            if (!response.ok) throw new Error('Failed to fetch zones');
            const data = await response.json();
            
            // Ensure each zone has all required properties
            const processedZones = data.map(zone => ({
                ...zone,
                properties: {
                    name: zone.properties?.name || `Zone ${zone.id || 'New'}`,
                    // Soil Variables
                    soil_moisture: zone.properties?.soil_moisture || null,
                    soil_temperature: zone.properties?.soil_temperature || null,
                    soil_ph: zone.properties?.soil_ph || null,
                    soil_nutrients: zone.properties?.soil_nutrients || {
                        nitrogen: null,
                        phosphorus: null,
                        potassium: null,
                        organic_matter: null
                    },
                    soil_type: zone.properties?.soil_type || null,
                    soil_depth: zone.properties?.soil_depth || null,
                    soil_salinity: zone.properties?.soil_salinity || null,
                    
                    // Environmental Variables
                    air_temperature: zone.properties?.air_temperature || null,
                    humidity: zone.properties?.humidity || null,
                    wind_speed: zone.properties?.wind_speed || null,
                    solar_radiation: zone.properties?.solar_radiation || null,
                    precipitation: zone.properties?.precipitation || null,
                    evapotranspiration: zone.properties?.evapotranspiration || null,
                    
                    // Additional Analytics
                    ndvi: zone.properties?.ndvi || null,
                    crop_health: zone.properties?.crop_health || null,
                    water_stress: zone.properties?.water_stress || null,
                    growth_stage: zone.properties?.growth_stage || null,
                    pest_risk: zone.properties?.pest_risk || null,
                    disease_risk: zone.properties?.disease_risk || null,
                    yield_prediction: zone.properties?.yield_prediction || null,
                    
                    // Irrigation Data
                    irrigation_status: zone.properties?.irrigation_status || 'inactive',
                    last_irrigation: zone.properties?.last_irrigation || null,
                    water_usage: zone.properties?.water_usage || null,
                    irrigation_efficiency: zone.properties?.irrigation_efficiency || null,
                    scheduled_irrigation: zone.properties?.scheduled_irrigation || null
                }
            }));
            
            setZones(processedZones);
            setError(null);
        } catch (err) {
            console.error('Error fetching zones:', err);
            setError('Failed to load zones. Please try again later.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchZones();
    }, [fetchZones]);

    const handleZoneSelect = (index) => {
        if (!editMode) {
            setSelectedZone(index);
        }
    };

    const handleZoneCreated = async (newZone) => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/zones`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newZone),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to create zone');
            }
            
            const createdZone = await response.json();
            setZones(prevZones => [...prevZones, createdZone]);
            setSelectedZone(zones.length); // Select the newly created zone
            setEditMode(false);
            setError(null);
        } catch (err) {
            console.error('Error creating zone:', err);
            setError('Failed to create zone. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateZone = async (zoneId, updates) => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/zones/${zoneId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
            });

            if (!response.ok) throw new Error('Failed to update zone');
            
            await fetchZones();
        } catch (err) {
            console.error('Error updating zone:', err);
            setError('Failed to update zone. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteZone = async (zoneId) => {
        if (!window.confirm('Are you sure you want to delete this zone?')) return;
        
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE_URL}/api/zones/${zoneId}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Failed to delete zone');
            
            await fetchZones();
            setSelectedZone(null);
        } catch (err) {
            console.error('Error deleting zone:', err);
            setError('Failed to delete zone. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const toggleEditMode = () => {
        setEditMode(!editMode);
        if (editMode) {
            setSelectedZone(null);
        }
    };

    return (
        <Box className="field-management-container">
            <Box className="header-container">
                <Typography variant="h4" component="h1">
                    Field Management
                </Typography>
                <Button
                    variant="contained"
                    color={editMode ? "secondary" : "primary"}
                    startIcon={editMode ? <SaveIcon /> : <EditIcon />}
                    onClick={toggleEditMode}
                    disabled={loading}
                >
                    {editMode ? "Save" : "Draw New Zone"}
                </Button>
            </Box>

            {error && (
                <Typography color="error" className="error-message">
                    {error}
                </Typography>
            )}

            <Grid container spacing={2} className="content-container">
                <Grid item xs={12} md={8} className="map-container">
                    {loading && (
                        <Box className="loading-overlay">
                            <CircularProgress />
                        </Box>
                    )}
                    <FieldMap
                        zones={zones}
                        selectedZone={selectedZone}
                        onZoneSelect={handleZoneSelect}
                        editMode={editMode}
                        onZoneCreated={handleZoneCreated}
                    />
                </Grid>

                <Grid item xs={12} md={4}>
                    {selectedZone !== null && zones[selectedZone] && (
                        <Box className="data-container">
                            <DataCarousel
                                zone={zones[selectedZone]}
                                onUpdate={(updates) => handleUpdateZone(zones[selectedZone].id, updates)}
                                onDelete={() => handleDeleteZone(zones[selectedZone].id)}
                            />
                        </Box>
                    )}
                </Grid>
            </Grid>
        </Box>
    );
};

export default FieldManagement;
