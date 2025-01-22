import React from 'react';
import { Box, Card, CardContent, Typography, IconButton, Grid, Paper, Chip } from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const IrrigationRecommendation = ({ recommendation }) => {
    if (!recommendation) return null;

    const getConfidenceColor = (confidence) => {
        switch (confidence) {
            case 'high': return 'success';
            case 'medium': return 'warning';
            case 'low': return 'error';
            default: return 'info';
        }
    };

    return (
        <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
                Irrigation Recommendation
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" color={recommendation.should_irrigate ? 'primary' : 'text.secondary'}>
                    {recommendation.should_irrigate ? 'Irrigation Recommended' : 'No Irrigation Needed'}
                </Typography>
                <Chip 
                    size="small" 
                    label={`${recommendation.confidence} confidence`}
                    color={getConfidenceColor(recommendation.confidence)}
                    sx={{ ml: 1 }}
                />
            </Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
                {recommendation.reason}
            </Typography>
            <Typography variant="caption" color="text.secondary">
                Source: {recommendation.source} | Updated: {new Date(recommendation.timestamp).toLocaleString()}
            </Typography>
        </Paper>
    );
};

const DataCarousel = ({ zone, onUpdate, onDelete }) => {
    if (!zone || !zone.properties) return null;

    const {
        // Soil Variables
        soil_moisture,
        soil_temperature,
        soil_ph,
        soil_nutrients,
        soil_type,
        soil_depth,
        soil_salinity,
        
        // Environmental Variables
        air_temperature,
        humidity,
        wind_speed,
        solar_radiation,
        precipitation,
        evapotranspiration,
        
        // Additional Analytics
        ndvi,
        crop_health,
        water_stress,
        growth_stage,
        pest_risk,
        disease_risk,
        yield_prediction,
        
        // Irrigation Data
        irrigation_status,
        last_irrigation,
        water_usage,
        irrigation_efficiency,
        scheduled_irrigation,
        irrigation_recommendation
    } = zone.properties;

    const sections = [
        {
            title: 'Soil Conditions',
            data: [
                { label: 'Moisture', value: soil_moisture, unit: '%' },
                { label: 'Temperature', value: soil_temperature, unit: '°C' },
                { label: 'pH', value: soil_ph, unit: '' },
                { label: 'Type', value: soil_type, unit: '' },
                { label: 'Depth', value: soil_depth, unit: 'cm' },
                { label: 'Salinity', value: soil_salinity, unit: 'dS/m' }
            ]
        },
        {
            title: 'Soil Nutrients',
            data: [
                { label: 'Nitrogen', value: soil_nutrients?.nitrogen, unit: 'ppm' },
                { label: 'Phosphorus', value: soil_nutrients?.phosphorus, unit: 'ppm' },
                { label: 'Potassium', value: soil_nutrients?.potassium, unit: 'ppm' },
                { label: 'Organic Matter', value: soil_nutrients?.organic_matter, unit: '%' }
            ]
        },
        {
            title: 'Environmental Conditions',
            data: [
                { label: 'Air Temperature', value: air_temperature, unit: '°C' },
                { label: 'Humidity', value: humidity, unit: '%' },
                { label: 'Wind Speed', value: wind_speed, unit: 'm/s' },
                { label: 'Solar Radiation', value: solar_radiation, unit: 'W/m²' },
                { label: 'Precipitation', value: precipitation, unit: 'mm' },
                { label: 'Evapotranspiration', value: evapotranspiration, unit: 'mm' }
            ]
        },
        {
            title: 'Crop Analytics',
            data: [
                { label: 'NDVI', value: ndvi, unit: '' },
                { label: 'Crop Health', value: crop_health, unit: '%' },
                { label: 'Water Stress', value: water_stress, unit: '%' },
                { label: 'Growth Stage', value: growth_stage, unit: '' },
                { label: 'Pest Risk', value: pest_risk, unit: '%' },
                { label: 'Disease Risk', value: disease_risk, unit: '%' },
                { label: 'Yield Prediction', value: yield_prediction, unit: 't/ha' }
            ]
        },
        {
            title: 'Irrigation Management',
            data: [
                { label: 'Status', value: irrigation_status, unit: '' },
                { label: 'Last Irrigation', value: last_irrigation ? new Date(last_irrigation).toLocaleDateString() : 'N/A', unit: '' },
                { label: 'Water Usage', value: water_usage, unit: 'm³' },
                { label: 'Irrigation Efficiency', value: irrigation_efficiency, unit: '%' },
                { label: 'Next Scheduled', value: scheduled_irrigation ? new Date(scheduled_irrigation).toLocaleDateString() : 'N/A', unit: '' }
            ]
        }
    ];

    return (
        <Box className="data-carousel">
            <Box className="data-carousel-header">
                <Typography variant="h5" gutterBottom>
                    {zone.properties.name || `Zone ${zone.id}`}
                </Typography>
                <Box>
                    <IconButton onClick={() => onUpdate(zone)} color="primary">
                        <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => onDelete(zone.id)} color="error">
                        <DeleteIcon />
                    </IconButton>
                </Box>
            </Box>

            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <IrrigationRecommendation recommendation={irrigation_recommendation} />
                </Grid>
                {sections.map((section, index) => (
                    <Grid item xs={12} key={index}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    {section.title}
                                </Typography>
                                <Grid container spacing={1}>
                                    {section.data.map((item, i) => (
                                        <Grid item xs={6} key={i}>
                                            <Typography variant="body2" color="textSecondary">
                                                {item.label}
                                            </Typography>
                                            <Typography variant="body1">
                                                {item.value !== null ? `${item.value}${item.unit}` : 'N/A'}
                                            </Typography>
                                        </Grid>
                                    ))}
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}

                {/* Historical Data Chart */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Historical Data
                            </Typography>
                            <Box style={{ width: '100%', height: 300 }}>
                                <LineChart
                                    width={500}
                                    height={300}
                                    data={[
                                        { name: 'Jan', moisture: 65, temp: 22 },
                                        { name: 'Feb', moisture: 59, temp: 24 },
                                        { name: 'Mar', moisture: 80, temp: 23 },
                                        { name: 'Apr', moisture: 81, temp: 25 },
                                        { name: 'May', moisture: 56, temp: 21 },
                                        { name: 'Jun', moisture: 55, temp: 20 }
                                    ]}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="moisture" stroke="#8884d8" name="Soil Moisture %" />
                                    <Line type="monotone" dataKey="temp" stroke="#82ca9d" name="Temperature °C" />
                                </LineChart>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default DataCarousel;
