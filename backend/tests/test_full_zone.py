from backend.services.zone_service import ZoneService
import asyncio
from datetime import datetime, timedelta
from pathlib import Path

async def test_full_zone():
    # Ensure data directory exists
    data_dir = Path(__file__).parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    # Initialize service
    zone_service = ZoneService()
    
    # Create a test zone with all properties
    test_zone = zone_service.create_zone(
        name="Corn Field A1",
        geometry={
            "type": "Polygon",
            "coordinates": [[
                [-99.1332, 19.4326],
                [-99.1322, 19.4326],
                [-99.1322, 19.4336],
                [-99.1332, 19.4336],
                [-99.1332, 19.4326]
            ]]
        },
        crop_type="Corn",
        irrigation_type="Drip"
    )
    
    # Update zone with additional properties
    zone_service.update_zone_properties(test_zone.zone_id, {
        "soil_type": "Clay Loam",
        "planting_date": (datetime.now() - timedelta(days=30)).isoformat(),
        "expected_harvest_date": (datetime.now() + timedelta(days=90)).isoformat(),
        "area_hectares": 1.5,
        "soil_depth_cm": 30,
        "field_capacity": 35,  # %
        "wilting_point": 15,   # %
        "target_moisture": 28   # %
    })
    
    # Get comprehensive zone data
    print("\nFetching zone data...")
    zone_data = await zone_service.get_zone_data(test_zone.zone_id, force_refresh=True)
    
    # Print zone information
    print("\nZone Information:")
    print(f"Name: {zone_data['zone']['name']}")
    print(f"Crop: {zone_data['zone']['crop_type']}")
    print(f"Soil: {zone_data['zone']['soil_type']}")
    print(f"Area: {zone_data['zone']['area_hectares']} ha")
    print(f"Planting Date: {zone_data['zone']['planting_date']}")
    print(f"Expected Harvest: {zone_data['zone']['expected_harvest_date']}")
    
    # Print soil conditions
    print("\nSoil Parameters:")
    print(f"Type: {zone_data['zone']['soil_type']}")
    print(f"Depth: {zone_data['zone']['soil_depth_cm']} cm")
    print(f"Field Capacity: {zone_data['zone']['field_capacity']}%")
    print(f"Wilting Point: {zone_data['zone']['wilting_point']}%")
    print(f"Target Moisture: {zone_data['zone']['target_moisture']}%")
    
    # Print current conditions
    print("\nCurrent Conditions:")
    satellite = zone_data['satellite']
    weather = zone_data['weather']
    
    print(f"Soil Moisture: {satellite['soil_moisture']['mean']:.1f}%")
    if 'current' in weather:
        print(f"Temperature: {weather['current'].get('temperature', 'N/A')}°C")
        print(f"Rain Probability: {weather['current'].get('precipitation_probability', 'N/A')}%")
    
    # Print weather forecast
    print("\nWeather Forecast:")
    if 'forecast' in weather:
        for day in weather['forecast'][:3]:  # Next 3 days
            date = day.get('date', 'Unknown')
            temp = day.get('temperature', 'N/A')
            rain_prob = day.get('precipitation_probability', 'N/A')
            rain_amount = day.get('precipitation', 'N/A')
            print(f"{date}: {temp}°C, Rain: {rain_prob}% ({rain_amount}mm)")
    
    # Print vegetation indices
    print("\nVegetation Indices:")
    print(f"NDVI: {satellite['ndvi']['mean']:.3f} (min: {satellite['ndvi']['min']:.3f}, max: {satellite['ndvi']['max']:.3f})")
    print(f"NDWI: {satellite['ndwi']['mean']:.3f} (min: {satellite['ndwi']['min']:.3f}, max: {satellite['ndwi']['max']:.3f})")
    print(f"EVI: {satellite['evi']['mean']:.3f} (min: {satellite['evi']['min']:.3f}, max: {satellite['evi']['max']:.3f})")
    
    # Print water status
    print("\nWater Status:")
    print(f"Evapotranspiration: {satellite.get('evapotranspiration', 'N/A')} mm/day")
    print(f"Water Stress Index: {satellite['water_stress']['index']:.2f}")
    print(f"Stress Level: {satellite['water_stress']['level']}")
    
    # Get irrigation recommendation
    print("\nIrrigation Recommendation:")
    recommendation = zone_service.get_irrigation_recommendation(test_zone.zone_id)
    if recommendation:
        print(f"Should Irrigate: {recommendation.get('recommendation', 'N/A')}")
        print(f"Irrigation Need: {recommendation.get('irrigation_need', 0):.1f} mm")
        print(f"Reason: {recommendation.get('reason', 'N/A')}")
        
        if recommendation.get('recommendation') == 'irrigate':
            # Record an irrigation event
            zone_service.record_irrigation(test_zone.zone_id)
            print("\nIrrigation recorded!")
            
            # Get updated data
            updated_data = await zone_service.get_zone_data(test_zone.zone_id, force_refresh=True)
            print(f"Updated Soil Moisture: {updated_data['satellite']['soil_moisture']['mean']:.1f}%")

if __name__ == "__main__":
    asyncio.run(test_full_zone())
