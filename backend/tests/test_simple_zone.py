import os
import asyncio
from pathlib import Path
from backend.services.zone_service import ZoneService

async def test_simple_zone():
    # Ensure data directory exists
    data_dir = Path(__file__).parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    
    # Initialize service
    zone_service = ZoneService()
    
    try:
        # Create a test zone
        print("\nCreating test zone...")
        test_zone = zone_service.create_zone(
            name="Test Field 1",
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
        
        print(f"Zone created successfully!")
        print(f"ID: {test_zone.zone_id}")
        print(f"Name: {test_zone.name}")
        print(f"Crop: {test_zone.crop_type}")
        print(f"Irrigation: {test_zone.irrigation_type}")
        
        # List all zones
        print("\nListing all zones:")
        zones = zone_service.list_zones()
        for zone in zones:
            print(f"- {zone.name} ({zone.zone_id})")
            
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_simple_zone())
