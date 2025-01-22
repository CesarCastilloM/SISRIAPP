from typing import Dict, Optional, List
import aiohttp
from datetime import datetime, timedelta
import numpy as np
from shapely.geometry import Polygon, Point
import logging

logger = logging.getLogger(__name__)

class WeatherService:
    def __init__(self):
        self.base_url = "https://api.open-meteo.com/v1"
        
    def _get_polygon_grid_points(self, polygon_coords: List[List[float]], grid_size: float = 0.01) -> List[Dict[str, float]]:
        """Generate a grid of points within the polygon for averaging weather data"""
        # Convert polygon coordinates to Shapely polygon
        polygon = Polygon(polygon_coords)
        
        # Get polygon bounds
        minx, miny, maxx, maxy = polygon.bounds
        
        # Create grid points
        x_coords = np.arange(minx, maxx, grid_size)
        y_coords = np.arange(miny, maxy, grid_size)
        
        points = []
        for x in x_coords:
            for y in y_coords:
                point = Point(x, y)
                if polygon.contains(point):
                    points.append({"latitude": y, "longitude": x})
        
        return points
        
    async def get_weather_data_for_polygon(self, polygon_coords: List[List[float]]) -> Dict:
        """Get aggregated weather data for a polygon area"""
        try:
            # Generate grid points within polygon
            grid_points = self._get_polygon_grid_points(polygon_coords)
            
            if not grid_points:
                raise ValueError("No valid points found within the polygon")
            
            # Collect weather data for all points
            weather_data_points = []
            for point in grid_points:
                data = await self.get_weather_data(point["latitude"], point["longitude"])
                weather_data_points.append(data)
            
            # Aggregate the data
            aggregated_data = self._aggregate_weather_data(weather_data_points)
            
            return {
                "current": aggregated_data["current"],
                "forecast": aggregated_data["forecast"],
                "grid_points": len(grid_points)
            }
            
        except Exception as e:
            logger.error(f"Error getting weather data for polygon: {str(e)}")
            raise
            
    def _aggregate_weather_data(self, weather_data_points: List[Dict]) -> Dict:
        """Aggregate weather data from multiple points"""
        if not weather_data_points:
            return {}
            
        # Initialize aggregated data structure
        aggregated = {
            "current": {},
            "forecast": []
        }
        
        # Aggregate current conditions
        current_keys = ["temperature", "humidity", "precipitation_probability", 
                       "precipitation", "soil_moisture"]
        
        for key in current_keys:
            values = [point["current"][key] for point in weather_data_points]
            aggregated["current"][key] = sum(values) / len(values)
            
        aggregated["current"]["timestamp"] = weather_data_points[0]["current"]["timestamp"]
        
        # Aggregate forecast data
        for day_idx in range(len(weather_data_points[0]["forecast"])):
            day_data = {}
            day_data["date"] = weather_data_points[0]["forecast"][day_idx]["date"]
            
            forecast_keys = ["temperature_max", "temperature_min", "precipitation", 
                           "precipitation_probability"]
            
            for key in forecast_keys:
                values = [point["forecast"][day_idx][key] for point in weather_data_points]
                day_data[key] = sum(values) / len(values)
                
            aggregated["forecast"].append(day_data)
            
        return aggregated
        
    async def get_weather_data(self, latitude: float, longitude: float) -> Dict:
        """Get weather data for a single location"""
        try:
            # Construct the API URL with all required parameters
            url = f"{self.base_url}/forecast"
            params = {
                "latitude": latitude,
                "longitude": longitude,
                "hourly": ["temperature_2m", "relative_humidity_2m", "precipitation_probability", 
                          "precipitation", "soil_moisture_0_to_7cm"],
                "daily": ["temperature_2m_max", "temperature_2m_min", "precipitation_sum", 
                         "precipitation_probability_max"],
                "timezone": "auto",
                "forecast_days": 7
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # Process current conditions
                        current_hour = datetime.now().hour
                        current = {
                            "temperature": data["hourly"]["temperature_2m"][current_hour],
                            "humidity": data["hourly"]["relative_humidity_2m"][current_hour],
                            "precipitation_probability": data["hourly"]["precipitation_probability"][current_hour],
                            "precipitation": data["hourly"]["precipitation"][current_hour],
                            "soil_moisture": data["hourly"]["soil_moisture_0_to_7cm"][current_hour],
                            "timestamp": datetime.now().isoformat()
                        }
                        
                        # Process forecast data
                        forecast = []
                        for i in range(7):  # 7 days forecast
                            day_data = {
                                "date": (datetime.now() + timedelta(days=i)).date().isoformat(),
                                "temperature_max": data["daily"]["temperature_2m_max"][i],
                                "temperature_min": data["daily"]["temperature_2m_min"][i],
                                "precipitation": data["daily"]["precipitation_sum"][i],
                                "precipitation_probability": data["daily"]["precipitation_probability_max"][i]
                            }
                            forecast.append(day_data)
                        
                        return {
                            "current": current,
                            "forecast": forecast
                        }
                    else:
                        raise Exception(f"Weather API returned status code: {response.status}")
                        
        except Exception as e:
            logger.error(f"Error fetching weather data: {str(e)}")
            raise
