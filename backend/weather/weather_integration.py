import requests
import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import json
from dataclasses import dataclass
from enum import Enum
import asyncio
import aiohttp
import math

class WeatherProvider(Enum):
    OPENWEATHER = "openweather"
    WEATHERAPI = "weatherapi"
    CLIMACELL = "climacell"
    DARKSKY = "darksky"
    OFFLINE = "offline"

@dataclass
class WeatherForecast:
    timestamp: datetime
    temperature: float
    humidity: float
    precipitation_probability: float
    wind_speed: float
    wind_direction: float
    cloud_cover: float
    uv_index: float
    pressure: float
    visibility: float
    solar_radiation: Optional[float] = None
    soil_temperature: Optional[float] = None
    leaf_wetness: Optional[float] = None

class WeatherIntegration:
    def __init__(self, api_keys: Dict[str, str], default_provider: WeatherProvider = WeatherProvider.OPENWEATHER):
        self.api_keys = api_keys
        self.default_provider = default_provider
        self.cache: Dict[str, Tuple[datetime, Dict]] = {}
        self.cache_duration = timedelta(minutes=30)
        
    async def get_weather_data(
        self,
        latitude: float,
        longitude: float,
        provider: Optional[WeatherProvider] = None
    ) -> Dict:
        """Get weather data from multiple providers and combine them"""
        provider = provider or self.default_provider
        cache_key = f"{latitude},{longitude},{provider.value}"
        
        # Check cache
        if cache_key in self.cache:
            timestamp, data = self.cache[cache_key]
            if datetime.now() - timestamp < self.cache_duration:
                return data
                
        async with aiohttp.ClientSession() as session:
            if provider == WeatherProvider.OPENWEATHER:
                data = await self._get_openweather_data(session, latitude, longitude)
            elif provider == WeatherProvider.WEATHERAPI:
                data = await self._get_weatherapi_data(session, latitude, longitude)
            elif provider == WeatherProvider.CLIMACELL:
                data = await self._get_climacell_data(session, latitude, longitude)
            elif provider == WeatherProvider.DARKSKY:
                data = await self._get_darksky_data(session, latitude, longitude)
            elif provider == WeatherProvider.OFFLINE:
                data = await self._get_offline_data(latitude, longitude)
            else:
                raise ValueError(f"Unsupported weather provider: {provider}")
                
        # Cache the results
        self.cache[cache_key] = (datetime.now(), data)
        return data
        
    async def get_agricultural_metrics(
        self,
        latitude: float,
        longitude: float
    ) -> Dict:
        """Get specialized agricultural weather metrics"""
        tasks = [
            self.get_weather_data(latitude, longitude, provider)
            for provider in WeatherProvider
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        valid_results = [r for r in results if isinstance(r, dict)]
        
        if not valid_results:
            raise Exception("No valid weather data available")
            
        # Combine and process data
        combined_data = self._combine_weather_data(valid_results)
        
        return {
            'current': self._calculate_agricultural_metrics(combined_data['current']),
            'hourly': [
                self._calculate_agricultural_metrics(hour_data)
                for hour_data in combined_data['hourly']
            ],
            'daily': [
                self._calculate_agricultural_metrics(day_data)
                for day_data in combined_data['daily']
            ]
        }
        
    async def _get_openweather_data(
        self,
        session: aiohttp.ClientSession,
        latitude: float,
        longitude: float
    ) -> Dict:
        """Get weather data from OpenWeather API"""
        url = f"https://api.openweathermap.org/data/2.5/onecall"
        params = {
            'lat': latitude,
            'lon': longitude,
            'appid': self.api_keys[WeatherProvider.OPENWEATHER.value],
            'units': 'metric',
            'exclude': 'minutely,alerts'
        }
        
        async with session.get(url, params=params) as response:
            data = await response.json()
            return self._format_openweather_data(data)
            
    async def _get_weatherapi_data(
        self,
        session: aiohttp.ClientSession,
        latitude: float,
        longitude: float
    ) -> Dict:
        """Get weather data from WeatherAPI"""
        url = f"https://api.weatherapi.com/v1/forecast.json"
        params = {
            'key': self.api_keys[WeatherProvider.WEATHERAPI.value],
            'q': f"{latitude},{longitude}",
            'days': 7,
            'aqi': 'yes'
        }
        
        async with session.get(url, params=params) as response:
            data = await response.json()
            return self._format_weatherapi_data(data)
            
    async def _get_offline_data(
        self,
        latitude: float,
        longitude: float
    ) -> Dict:
        """Get data from offline calculations or last known values"""
        try:
            current_hour = datetime.now().hour
            
            # Estimate temperature based on time of day
            est_temp = self._estimate_temperature(current_hour)
            
            # Estimate humidity based on time of day
            est_humidity = self._estimate_humidity(current_hour)
            
            # Use typical wind speed if no last known value
            wind_speed = 2.0  # typical light breeze
            
            # Calculate solar radiation based on latitude and time
            solar_radiation = self._estimate_solar_radiation(latitude)
            
            # Calculate ETo with estimated values
            eto = self._calculate_eto(
                est_temp,
                est_humidity,
                wind_speed,
                solar_radiation
            )
            
            return {
                'temperature': est_temp,
                'humidity': est_humidity,
                'wind_speed': wind_speed,
                'solar_radiation': solar_radiation,
                'eto': eto,
                'status': 'offline'
            }
            
        except Exception as e:
            print(f"Error generating offline data: {str(e)}")
            return {
                'temperature': 20,
                'humidity': 50,
                'wind_speed': 2.0,
                'solar_radiation': 0,
                'eto': 0,
                'status': 'error'
            }

    def _combine_weather_data(self, data_list: List[Dict]) -> Dict:
        """Combine weather data from multiple sources"""
        combined = {
            'current': {},
            'hourly': [],
            'daily': []
        }
        
        # Combine current conditions
        for key in ['temperature', 'humidity', 'wind_speed', 'pressure']:
            values = [d['current'].get(key) for d in data_list if key in d['current']]
            if values:
                combined['current'][key] = np.median(values)
                
        # Combine hourly forecasts
        max_hours = min(len(d['hourly']) for d in data_list)
        for hour in range(max_hours):
            hour_data = {}
            for key in ['temperature', 'humidity', 'precipitation_probability']:
                values = [d['hourly'][hour].get(key) for d in data_list if key in d['hourly'][hour]]
                if values:
                    hour_data[key] = np.median(values)
            combined['hourly'].append(hour_data)
            
        # Combine daily forecasts
        max_days = min(len(d['daily']) for d in data_list)
        for day in range(max_days):
            day_data = {}
            for key in ['temperature_max', 'temperature_min', 'precipitation_probability']:
                values = [d['daily'][day].get(key) for d in data_list if key in d['daily'][day]]
                if values:
                    day_data[key] = np.median(values)
            combined['daily'].append(day_data)
            
        return combined
        
    def _calculate_agricultural_metrics(self, weather_data: Dict) -> Dict:
        """Calculate agricultural metrics from weather data"""
        metrics = {}
        
        # Calculate Vapor Pressure Deficit (VPD)
        if 'temperature' in weather_data and 'humidity' in weather_data:
            temp = weather_data['temperature']
            humidity = weather_data['humidity']
            
            # Saturated vapor pressure
            svp = 0.611 * np.exp(17.27 * temp / (temp + 237.3))
            # Actual vapor pressure
            avp = svp * (humidity / 100)
            # VPD in kPa
            metrics['vpd'] = svp - avp
            
        # Calculate Growing Degree Days (GDD)
        if 'temperature_max' in weather_data and 'temperature_min' in weather_data:
            base_temp = 10  # Celsius, adjust based on crop
            max_temp = min(weather_data['temperature_max'], 30)  # Cap at 30C
            min_temp = max(weather_data['temperature_min'], base_temp)
            metrics['gdd'] = max(0, (max_temp + min_temp) / 2 - base_temp)
            
        # Calculate Evapotranspiration (ET0) using simplified Penman-Monteith
        if all(key in weather_data for key in ['temperature', 'humidity', 'wind_speed', 'solar_radiation']):
            temp = weather_data['temperature']
            humidity = weather_data['humidity']
            wind = weather_data['wind_speed']
            radiation = weather_data['solar_radiation']
            
            # Constants
            albedo = 0.23
            lat_heat = 2.45  # MJ/kg
            psy = 0.067  # kPa/°C
            
            # Net radiation
            rn = radiation * (1 - albedo)
            
            # Vapor pressure deficit
            svp = 0.611 * np.exp(17.27 * temp / (temp + 237.3))
            avp = svp * (humidity / 100)
            vpd = svp - avp
            
            # Slope of vapor pressure curve
            delta = 4098 * svp / ((temp + 237.3) ** 2)
            
            # Reference ET0 (mm/day)
            eto = (0.408 * delta * (rn - 0) + psy * (900 / (temp + 273)) * wind * vpd) / (delta + psy * (1 + 0.34 * wind))
            metrics['et0'] = max(0, eto)
            
        # Calculate Dew Point
        if 'temperature' in weather_data and 'humidity' in weather_data:
            temp = weather_data['temperature']
            humidity = weather_data['humidity']
            
            a = 17.27
            b = 237.7
            
            def dewpoint(t, h):
                temp = (a * t) / (b + t) + np.log(h/100.0)
                return (b * temp) / (a - temp)
                
            metrics['dew_point'] = dewpoint(temp, humidity)
            
        # Calculate Heat Stress Index
        if 'temperature' in weather_data and 'humidity' in weather_data:
            temp = weather_data['temperature']
            humidity = weather_data['humidity']
            
            # Simple heat index calculation
            metrics['heat_stress_index'] = -8.784695 + 1.61139411 * temp + 2.338549 * humidity - 0.14611605 * temp * humidity - 0.012308094 * temp**2 - 0.016424828 * humidity**2 + 0.002211732 * temp**2 * humidity + 0.00072546 * temp * humidity**2 - 0.000003582 * temp**2 * humidity**2
            
        return metrics
        
    def _format_openweather_data(self, data: Dict) -> Dict:
        """Format OpenWeather API response"""
        return {
            'current': {
                'temperature': data['current']['temp'],
                'humidity': data['current']['humidity'],
                'wind_speed': data['current']['wind_speed'],
                'pressure': data['current']['pressure'],
                'uv_index': data['current']['uvi'],
                'cloud_cover': data['current']['clouds']
            },
            'hourly': [
                {
                    'timestamp': datetime.fromtimestamp(hour['dt']),
                    'temperature': hour['temp'],
                    'humidity': hour['humidity'],
                    'precipitation_probability': hour.get('pop', 0) * 100,
                    'wind_speed': hour['wind_speed'],
                    'pressure': hour['pressure']
                }
                for hour in data['hourly']
            ],
            'daily': [
                {
                    'timestamp': datetime.fromtimestamp(day['dt']),
                    'temperature_max': day['temp']['max'],
                    'temperature_min': day['temp']['min'],
                    'humidity': day['humidity'],
                    'precipitation_probability': day.get('pop', 0) * 100,
                    'wind_speed': day['wind_speed'],
                    'uv_index': day['uvi']
                }
                for day in data['daily']
            ]
        }
        
    def _format_weatherapi_data(self, data: Dict) -> Dict:
        """Format WeatherAPI response"""
        return {
            'current': {
                'temperature': data['current']['temp_c'],
                'humidity': data['current']['humidity'],
                'wind_speed': data['current']['wind_kph'] / 3.6,  # Convert to m/s
                'pressure': data['current']['pressure_mb'],
                'cloud_cover': data['current']['cloud'],
                'uv_index': data['current']['uv']
            },
            'hourly': [
                {
                    'timestamp': datetime.strptime(hour['time'], '%Y-%m-%d %H:%M'),
                    'temperature': hour['temp_c'],
                    'humidity': hour['humidity'],
                    'precipitation_probability': hour['chance_of_rain'],
                    'wind_speed': hour['wind_kph'] / 3.6
                }
                for day in data['forecast']['forecastday']
                for hour in day['hour']
            ],
            'daily': [
                {
                    'timestamp': datetime.strptime(day['date'], '%Y-%m-%d'),
                    'temperature_max': day['day']['maxtemp_c'],
                    'temperature_min': day['day']['mintemp_c'],
                    'humidity': day['day']['avghumidity'],
                    'precipitation_probability': day['day']['daily_chance_of_rain'],
                    'wind_speed': day['day']['maxwind_kph'] / 3.6,
                    'uv_index': day['day']['uv']
                }
                for day in data['forecast']['forecastday']
            ]
        }

    def _estimate_temperature(self, hour: int) -> float:
        """Estimate temperature based on time of day"""
        # Basic diurnal temperature variation model
        base_temp = 20  # baseline temperature
        amplitude = 5   # temperature variation amplitude
        
        # Temperature peaks at 15:00 (hour 15) and is lowest at 03:00 (hour 3)
        phase_shift = (hour - 15) * math.pi / 12
        temp = base_temp + amplitude * math.cos(phase_shift)
        
        return round(temp, 1)

    def _estimate_humidity(self, hour: int) -> float:
        """Estimate humidity based on time of day"""
        # Humidity is typically inverse to temperature
        base_humidity = 60  # baseline humidity
        amplitude = 20      # humidity variation amplitude
        
        # Humidity peaks at 03:00 (hour 3) and is lowest at 15:00 (hour 15)
        phase_shift = (hour - 3) * math.pi / 12
        humidity = base_humidity + amplitude * math.cos(phase_shift)
        
        return round(max(min(humidity, 100), 0), 1)

    def _estimate_solar_radiation(self, latitude: float) -> float:
        """Estimate solar radiation based on latitude and time"""
        current_hour = datetime.now().hour
        
        # No solar radiation at night
        if current_hour < 6 or current_hour > 18:
            return 0
        
        # Get day of year
        day_of_year = datetime.now().timetuple().tm_yday
        
        # Convert latitude to radians
        lat_rad = math.radians(latitude)
        
        # Solar declination
        solar_dec = 0.409 * math.sin(2 * math.pi * day_of_year / 365 - 1.39)
        
        # Hour angle (solar noon = 0)
        hour_angle = math.pi * (current_hour - 12) / 12
        
        # Solar elevation
        solar_elevation = math.asin(
            math.sin(lat_rad) * math.sin(solar_dec) +
            math.cos(lat_rad) * math.cos(solar_dec) * math.cos(hour_angle)
        )
        
        # Potential solar radiation at surface
        if solar_elevation > 0:
            # Simplified clear-sky radiation model
            solar_constant = 1367  # W/m²
            atmospheric_transmission = 0.7  # clear sky
            
            radiation = solar_constant * atmospheric_transmission * math.sin(solar_elevation)
            return max(0, radiation * 0.0864)  # Convert to MJ/m²/day
        
        return 0

    def _calculate_eto(self, temperature: float, humidity: float, wind_speed: float, solar_radiation: float) -> float:
        """Calculate reference evapotranspiration (ETo) using FAO Penman-Monteith"""
        try:
            if None in (temperature, humidity, wind_speed, solar_radiation):
                return 0
                
            # Constants
            albedo = 0.23  # Surface reflectance
            stefan_boltzmann = 4.903e-9  # Stefan-Boltzmann constant MJ/K⁴/m²/day
            
            # Convert temperature to Kelvin
            temp_k = temperature + 273.16
            
            # Saturation vapor pressure (kPa)
            es = 0.6108 * math.exp(17.27 * temperature / (temperature + 237.3))
            
            # Actual vapor pressure (kPa)
            ea = es * humidity / 100
            
            # Slope of saturation vapor pressure curve (kPa/°C)
            delta = 4098 * es / math.pow(temperature + 237.3, 2)
            
            # Psychrometric constant (kPa/°C)
            gamma = 0.067
            
            # Net radiation
            rns = (1 - albedo) * solar_radiation
            rnl = stefan_boltzmann * math.pow(temp_k, 4) * (0.34 - 0.14 * math.sqrt(ea)) * 0.1
            rn = rns - rnl
            
            # Soil heat flux (assumed negligible for daily calculation)
            g = 0
            
            # Reference evapotranspiration (mm/day)
            num = 0.408 * delta * (rn - g) + gamma * (900 / temp_k) * wind_speed * (es - ea)
            den = delta + gamma * (1 + 0.34 * wind_speed)
            eto = num / den
            
            return max(0, round(eto, 2))
            
        except Exception as e:
            print(f"Error calculating ETo: {str(e)}")
            return 0
