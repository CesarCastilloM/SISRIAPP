import asyncio
from backend.services.satellite_service import SatelliteService
import json

async def test_satellite():
    # Create satellite service instance
    satellite_service = SatelliteService()
    
    # Test zone (example coordinates for a field)
    test_zone = {
        "type": "Polygon",
        "coordinates": [[
            [-99.1332, 19.4326],  # Southwest corner
            [-99.1322, 19.4326],  # Southeast corner
            [-99.1322, 19.4336],  # Northeast corner
            [-99.1332, 19.4336],  # Northwest corner
            [-99.1332, 19.4326]   # Back to start
        ]]
    }
    
    try:
        # Get satellite data
        print("Fetching satellite data...")
        data = await satellite_service.get_zone_data("test_zone", test_zone)
        
        # Print vegetation indices
        print("\nVegetation Indices:")
        print(f"NDVI: {data['ndvi']['mean']:.3f} (min: {data['ndvi']['min']:.3f}, max: {data['ndvi']['max']:.3f})")
        print(f"NDWI: {data['ndwi']['mean']:.3f} (min: {data['ndwi']['min']:.3f}, max: {data['ndwi']['max']:.3f})")
        print(f"EVI: {data['evi']['mean']:.3f} (min: {data['evi']['min']:.3f}, max: {data['evi']['max']:.3f})")
        
        # Print soil conditions
        print("\nSoil Conditions:")
        print(f"Moisture: {data['soil_moisture']['mean']:.1f}% (min: {data['soil_moisture']['min']:.1f}%, max: {data['soil_moisture']['max']:.1f}%)")
        print(f"Surface Temperature: {data['land_surface_temp']['mean']:.1f}°C (min: {data['land_surface_temp']['min']:.1f}°C, max: {data['land_surface_temp']['max']:.1f}°C)")
        
        # Print water stress
        print("\nWater Status:")
        print(f"Evapotranspiration: {data['evapotranspiration']:.2f} mm/day")
        print(f"Water Stress Index: {data['water_stress']['index']:.2f}")
        print(f"Stress Level: {data['water_stress']['level']}")
        
        print(f"\nData Status: {data['status']}")
        print(f"Timestamp: {data['timestamp']}")
        
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_satellite())
