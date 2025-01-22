import unittest
from datetime import datetime, timedelta
from backend.services.zone_service import ZoneService
from backend.models.zone import Zone
import asyncio

class TestZones(unittest.TestCase):
    def setUp(self):
        """Set up test zones with realistic data"""
        self.zone_service = ZoneService()
        
        # Create test zones with different characteristics
        self.corn_zone = {
            'zone_id': 'zone_001',
            'name': 'Corn Field Alpha',
            'area_hectares': 25.5,
            'crop_type': 'corn',
            'soil_type': 'loam',
            'location': {'lat': 31.7619, 'lon': -106.4850},  # El Paso coordinates
            'planting_date': (datetime.now() - timedelta(days=45)).isoformat(),
            'expected_harvest': (datetime.now() + timedelta(days=75)).isoformat(),
            'geometry': {
                "type": "Polygon",
                "coordinates": [[
                    [-106.4860, 31.7609],  # Southwest corner
                    [-106.4840, 31.7609],  # Southeast corner
                    [-106.4840, 31.7629],  # Northeast corner
                    [-106.4860, 31.7629],  # Northwest corner
                    [-106.4860, 31.7609]   # Back to start
                ]]
            },
            'irrigation_type': 'sprinkler'
        }
        
        self.cotton_zone = {
            'zone_id': 'zone_002',
            'name': 'Cotton Field Beta',
            'area_hectares': 30.0,
            'crop_type': 'cotton',
            'soil_type': 'sandy_loam',
            'location': {'lat': 31.7555, 'lon': -106.4880},
            'planting_date': (datetime.now() - timedelta(days=60)).isoformat(),
            'expected_harvest': (datetime.now() + timedelta(days=90)).isoformat(),
            'geometry': {
                "type": "Polygon",
                "coordinates": [[
                    [-106.4890, 31.7545],
                    [-106.4870, 31.7545],
                    [-106.4870, 31.7565],
                    [-106.4890, 31.7565],
                    [-106.4890, 31.7545]
                ]]
            },
            'irrigation_type': 'drip'
        }
        
        self.alfalfa_zone = {
            'zone_id': 'zone_003',
            'name': 'Alfalfa Field Gamma',
            'area_hectares': 15.75,
            'crop_type': 'alfalfa',
            'soil_type': 'clay_loam',
            'location': {'lat': 31.7590, 'lon': -106.4870},
            'planting_date': (datetime.now() - timedelta(days=30)).isoformat(),
            'expected_harvest': (datetime.now() + timedelta(days=120)).isoformat(),
            'geometry': {
                "type": "Polygon",
                "coordinates": [[
                    [-106.4880, 31.7580],
                    [-106.4860, 31.7580],
                    [-106.4860, 31.7600],
                    [-106.4880, 31.7600],
                    [-106.4880, 31.7580]
                ]]
            },
            'irrigation_type': 'flood'
        }

    def test_create_zones(self):
        """Test creating multiple zones"""
        # Create zones
        for zone_data in [self.corn_zone, self.cotton_zone, self.alfalfa_zone]:
            zone = Zone(**zone_data)
            result = self.zone_service.create_zone(zone)
            self.assertTrue(result)
            
        # Verify zones were created
        zones = self.zone_service.get_all_zones()
        self.assertEqual(len(zones), 3)

    def test_zone_irrigation_history(self):
        """Test recording and retrieving irrigation history"""
        # Create a zone
        zone = Zone(**self.corn_zone)
        self.zone_service.create_zone(zone)
        
        # Record multiple irrigation events
        irrigation_events = [
            {'amount': 25.5, 'duration': 120, 'type': 'sprinkler'},
            {'amount': 20.0, 'duration': 90, 'type': 'drip'},
            {'amount': 30.0, 'duration': 150, 'type': 'sprinkler'}
        ]
        
        for event in irrigation_events:
            self.zone_service.record_irrigation(
                self.corn_zone['zone_id'],
                event['amount'],
                event['duration'],
                event['type']
            )
        
        # Get historical data
        history = self.zone_service.get_historical_data(
            self.corn_zone['zone_id'],
            start_date=(datetime.now() - timedelta(days=7)).isoformat(),
            end_date=datetime.now().isoformat()
        )
        
        self.assertIsNotNone(history)
        self.assertTrue('daily_data' in history)
        self.assertTrue('summary' in history)

    def test_zone_comparison(self):
        """Test comparing multiple zones"""
        # Create all zones
        for zone_data in [self.corn_zone, self.cotton_zone, self.alfalfa_zone]:
            zone = Zone(**zone_data)
            self.zone_service.create_zone(zone)
            
            # Add some irrigation events
            self.zone_service.record_irrigation(
                zone_data['zone_id'],
                amount=25.0,
                duration=120,
                irrigation_type='sprinkler'
            )
        
        # Compare zones
        comparison = self.zone_service.compare_zones(
            [self.corn_zone['zone_id'], self.cotton_zone['zone_id'], self.alfalfa_zone['zone_id']]
        )
        
        self.assertIsNotNone(comparison)
        self.assertTrue('zones' in comparison)
        self.assertTrue('summary' in comparison)

    def test_export_zone_data(self):
        """Test exporting zone data"""
        # Create a zone with irrigation history
        zone = Zone(**self.corn_zone)
        self.zone_service.create_zone(zone)
        
        # Add irrigation events
        self.zone_service.record_irrigation(
            self.corn_zone['zone_id'],
            amount=25.0,
            duration=120,
            irrigation_type='sprinkler'
        )
        
        # Export data
        export_data = self.zone_service.export_zone_data(self.corn_zone['zone_id'])
        
        self.assertIsNotNone(export_data)
        self.assertTrue('zone_info' in export_data)
        self.assertTrue('statistics' in export_data)
        self.assertTrue('historical_data' in export_data)

    def tearDown(self):
        """Clean up after tests"""
        # Clear all zones
        self.zone_service.zones.clear()

if __name__ == '__main__':
    unittest.main()
