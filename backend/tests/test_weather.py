import asyncio
from backend.services.weather_service import WeatherService
import json

async def test_weather():
    # Create weather service instance
    weather_service = WeatherService()
    
    # Test coordinates for Mexico City
    latitude = 19.4326
    longitude = -99.1332
    
    try:
        # Get weather data
        print("Fetching weather data...")
        data = await weather_service.get_weather_data(latitude, longitude)
        
        # Print current weather
        print("\nCurrent Weather:")
        print(f"Temperature: {data['current']['temperature']}°C")
        print(f"Humidity: {data['current']['humidity']}%")
        print(f"Wind Speed: {data['current']['wind_speed']} m/s")
        print(f"Precipitation Probability: {data['current']['precipitation_probability']}%")
        print(f"Solar Radiation: {data['current']['solar_radiation']} W/m²")
        print(f"ETo: {data['current']['eto']:.2f} mm/day")
        
        # Print forecast
        print("\n5-Day Forecast:")
        for day in data['forecast']:
            print(f"\nDate: {day['date']}")
            print(f"Temperature: {day['temperature']}°C")
            print(f"Humidity: {day['humidity']}%")
            print(f"Wind Speed: {day['wind_speed']} m/s")
            print(f"Precipitation Probability: {day['precipitation_probability']}%")
            print(f"ETo: {day['eto']:.2f} mm/day")
        
        print(f"\nData Status: {data['status']}")
        print(f"Timestamp: {data['timestamp']}")
        
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_weather())
