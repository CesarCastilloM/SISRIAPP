import React from 'react';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import { WbSunny, Cloud, Opacity, Air } from '@mui/icons-material';

export default function Weather() {
  const currentWeather = {
    temperature: '75°F',
    condition: 'Partly Cloudy',
    humidity: '45%',
    windSpeed: '8 mph'
  };

  const forecast = [
    { day: 'Today', high: '75°F', low: '60°F', condition: 'Partly Cloudy', rain: '0%' },
    { day: 'Tomorrow', high: '78°F', low: '62°F', condition: 'Sunny', rain: '0%' },
    { day: 'Wednesday', high: '72°F', low: '58°F', condition: 'Rain', rain: '60%' },
    { day: 'Thursday', high: '70°F', low: '55°F', condition: 'Cloudy', rain: '30%' },
    { day: 'Friday', high: '73°F', low: '57°F', condition: 'Sunny', rain: '0%' }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Weather Forecast
      </Typography>

      {/* Current Weather */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <WbSunny sx={{ fontSize: 60, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography variant="h3">{currentWeather.temperature}</Typography>
                  <Typography variant="h6" color="textSecondary">
                    {currentWeather.condition}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Opacity sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography>
                      Humidity: {currentWeather.humidity}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Air sx={{ mr: 1, color: 'info.main' }} />
                    <Typography>
                      Wind: {currentWeather.windSpeed}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 5-Day Forecast */}
      <Typography variant="h5" gutterBottom>5-Day Forecast</Typography>
      <Grid container spacing={2}>
        {forecast.map((day, index) => (
          <Grid item xs={12} sm={6} md={2.4} key={index}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {day.day}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {day.condition === 'Sunny' ? (
                    <WbSunny sx={{ color: 'warning.main', mr: 1 }} />
                  ) : (
                    <Cloud sx={{ color: 'action.active', mr: 1 }} />
                  )}
                  <Typography>{day.condition}</Typography>
                </Box>
                <Typography color="textSecondary">
                  High: {day.high}
                </Typography>
                <Typography color="textSecondary">
                  Low: {day.low}
                </Typography>
                <Typography color="primary">
                  Rain: {day.rain}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
