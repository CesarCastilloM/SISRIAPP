import React from 'react';
import { Box, Paper, Typography, Grid, Divider } from '@mui/material';
import { WbSunny, Opacity, Air, Thermostat } from '@mui/icons-material';

const WeatherForecast = ({ zoneData }) => {
    if (!zoneData || !zoneData.weather) {
        return (
            <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>
                    Weather Conditions
                </Typography>
                <Typography color="text.secondary">
                    No weather data available
                </Typography>
            </Paper>
        );
    }

    const getWeatherIcon = (condition) => {
        switch (condition?.toLowerCase()) {
            case 'sunny':
                return '☀️';
            case 'partly cloudy':
                return '⛅';
            case 'cloudy':
                return '☁️';
            case 'rainy':
                return '🌧️';
            default:
                return '☀️';
        }
    };

    return (
        <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
                Weather Conditions - {zoneData.name || 'Unknown Zone'}
            </Typography>
            
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Thermostat sx={{ mr: 1, color: 'primary.main' }} />
                        <Box>
                            <Typography variant="body2" color="textSecondary">
                                Temperature
                            </Typography>
                            <Typography variant="h6">
                                {zoneData.weather.temperature || '--'}°C
                            </Typography>
                        </Box>
                    </Box>
                </Grid>
                
                <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Opacity sx={{ mr: 1, color: 'primary.main' }} />
                        <Box>
                            <Typography variant="body2" color="textSecondary">
                                Humidity
                            </Typography>
                            <Typography variant="h6">
                                {zoneData.weather.humidity || '--'}%
                            </Typography>
                        </Box>
                    </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <WbSunny sx={{ mr: 1, color: 'primary.main' }} />
                        <Box>
                            <Typography variant="body2" color="textSecondary">
                                Solar Radiation
                            </Typography>
                            <Typography variant="h6">
                                {zoneData.weather.solarRadiation || '--'} W/m²
                            </Typography>
                        </Box>
                    </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Air sx={{ mr: 1, color: 'primary.main' }} />
                        <Box>
                            <Typography variant="body2" color="textSecondary">
                                Wind Speed
                            </Typography>
                            <Typography variant="h6">
                                {zoneData.weather.windSpeed || '--'} km/h
                            </Typography>
                        </Box>
                    </Box>
                </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" gutterBottom>
                5-Day Forecast
            </Typography>

            <Grid container spacing={1}>
                {(zoneData.weather.forecast || []).map((day, index) => (
                    <Grid item xs={12/5} key={index}>
                        <Box
                            sx={{
                                textAlign: 'center',
                                p: 1,
                                borderRadius: 1,
                                bgcolor: 'background.default'
                            }}
                        >
                            <Typography variant="body2" color="textSecondary">
                                {day.date || '--'}
                            </Typography>
                            <Typography variant="h4" sx={{ my: 1 }}>
                                {getWeatherIcon(day.condition)}
                            </Typography>
                            <Typography variant="body2">
                                {day.tempMax || '--'}° / {day.tempMin || '--'}°
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                                {day.rainChance || '--'}% rain
                            </Typography>
                        </Box>
                    </Grid>
                ))}
            </Grid>
        </Paper>
    );
};

export default WeatherForecast;
