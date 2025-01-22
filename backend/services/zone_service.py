from typing import Dict, List, Optional
from datetime import datetime, timedelta
from backend.models.zone import Zone
import json
from pathlib import Path
import os

class ZoneService:
    def __init__(self):
        """Initialize zone service"""
        self.zones: Dict[str, Zone] = {}
        self._load_zones()

    def create_zone(self, zone: Zone) -> bool:
        """Create a new zone"""
        try:
            self.zones[zone.zone_id] = zone
            self._save_zones()
            return True
        except Exception as e:
            print(f"Error creating zone: {e}")
            return False

    def get_zone(self, zone_id: str) -> Optional[Zone]:
        """Get a zone by ID"""
        return self.zones.get(zone_id)

    def get_all_zones(self) -> List[Zone]:
        """Get all zones"""
        return list(self.zones.values())

    def record_irrigation(self, zone_id: str, amount: float, duration: int, irrigation_type: str) -> bool:
        """Record an irrigation event"""
        zone = self.get_zone(zone_id)
        if not zone:
            return False

        try:
            event = {
                'timestamp': datetime.now().isoformat(),
                'amount': amount,
                'duration': duration,
                'type': irrigation_type
            }
            zone.irrigation_history.append(event)
            self._save_zones()
            return True
        except Exception as e:
            print(f"Error recording irrigation: {e}")
            return False

    def get_historical_data(self, zone_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> Optional[Dict]:
        """Get historical data for a zone within a date range"""
        zone = self.get_zone(zone_id)
        if not zone:
            return None
            
        # Convert dates to datetime objects
        try:
            start = datetime.fromisoformat(start_date) if start_date else datetime.now() - timedelta(days=30)
            end = datetime.fromisoformat(end_date) if end_date else datetime.now()
        except ValueError:
            return None
            
        # Filter irrigation history
        irrigation_history = []
        for event in zone.irrigation_history:
            event_date = datetime.fromisoformat(event['timestamp'])
            if start <= event_date <= end:
                irrigation_history.append(event)
                
        # Calculate daily aggregates
        daily_data = {}
        current_date = start
        while current_date <= end:
            date_str = current_date.date().isoformat()
            
            # Get irrigation events for this day
            day_irrigation = sum(
                event.get('amount', 0)
                for event in irrigation_history
                if datetime.fromisoformat(event['timestamp']).date().isoformat() == date_str
            )
            
            # Add to daily data
            daily_data[date_str] = {
                'date': date_str,
                'irrigation_amount': day_irrigation,
                'soil_moisture': zone.cached_satellite.get('soil_moisture', {}).get('mean', 0) if zone.cached_satellite else 0,
                'ndvi': zone.cached_satellite.get('ndvi', {}).get('mean', 0) if zone.cached_satellite else 0,
                'evi': zone.cached_satellite.get('evi', {}).get('mean', 0) if zone.cached_satellite else 0,
                'water_stress': zone.cached_satellite.get('water_stress', {}).get('index', 0) if zone.cached_satellite else 0
            }
            
            current_date += timedelta(days=1)
            
        return {
            'daily_data': list(daily_data.values()),
            'summary': {
                'total_irrigation': sum(day['irrigation_amount'] for day in daily_data.values()),
                'avg_soil_moisture': sum(day['soil_moisture'] for day in daily_data.values()) / len(daily_data),
                'avg_ndvi': sum(day['ndvi'] for day in daily_data.values()) / len(daily_data),
                'avg_evi': sum(day['evi'] for day in daily_data.values()) / len(daily_data),
                'avg_water_stress': sum(day['water_stress'] for day in daily_data.values()) / len(daily_data)
            }
        }

    def compare_zones(self, zone_ids: List[str]) -> Dict:
        """Compare multiple zones"""
        comparison = {
            'zones': {},
            'summary': {
                'total_water_used': {},
                'avg_soil_moisture': {},
                'avg_ndvi': {},
                'irrigation_frequency': {},
                'water_stress_levels': {}
            }
        }
        
        for zone_id in zone_ids:
            zone = self.get_zone(zone_id)
            if not zone:
                continue
                
            # Calculate zone statistics
            total_water = sum(event.get('amount', 0) for event in zone.irrigation_history)
            avg_soil_moisture = (
                zone.cached_satellite.get('soil_moisture', {}).get('mean', 0)
                if zone.cached_satellite else 0
            )
            avg_ndvi = (
                zone.cached_satellite.get('ndvi', {}).get('mean', 0)
                if zone.cached_satellite else 0
            )
            water_stress = (
                zone.cached_satellite.get('water_stress', {}).get('index', 0)
                if zone.cached_satellite else 0
            )
            
            # Add to comparison
            comparison['zones'][zone_id] = {
                'name': zone.name,
                'crop_type': zone.crop_type,
                'area_hectares': zone.area_hectares,
                'statistics': {
                    'total_water_used': total_water,
                    'avg_soil_moisture': avg_soil_moisture,
                    'avg_ndvi': avg_ndvi,
                    'water_stress': water_stress,
                    'irrigation_count': len(zone.irrigation_history)
                }
            }
            
            # Add to summary
            comparison['summary']['total_water_used'][zone_id] = total_water
            comparison['summary']['avg_soil_moisture'][zone_id] = avg_soil_moisture
            comparison['summary']['avg_ndvi'][zone_id] = avg_ndvi
            comparison['summary']['irrigation_frequency'][zone_id] = len(zone.irrigation_history)
            comparison['summary']['water_stress_levels'][zone_id] = water_stress
            
        return comparison

    def export_zone_data(self, zone_id: str, format: str = 'json') -> Optional[Dict]:
        """Export zone data"""
        zone = self.get_zone(zone_id)
        if not zone:
            return None
            
        # Get all relevant data
        historical = self.get_historical_data(zone_id)
        
        # Calculate statistics
        total_water = sum(event.get('amount', 0) for event in zone.irrigation_history)
        avg_soil_moisture = (
            zone.cached_satellite.get('soil_moisture', {}).get('mean', 0)
            if zone.cached_satellite else 0
        )
        
        statistics = {
            'total_water_used': total_water,
            'irrigation_count': len(zone.irrigation_history),
            'soil_health': {
                'moisture': avg_soil_moisture,
                'water_stress': zone.cached_satellite.get('water_stress', {}).get('index', 0) if zone.cached_satellite else 0
            },
            'current_indices': {
                'ndvi': zone.cached_satellite.get('ndvi', {}).get('mean', 0) if zone.cached_satellite else 0,
                'evi': zone.cached_satellite.get('evi', {}).get('mean', 0) if zone.cached_satellite else 0
            }
        }
        
        export_data = {
            'zone_info': zone.to_dict(),
            'statistics': statistics,
            'historical_data': historical,
            'export_date': datetime.now().isoformat(),
            'metadata': {
                'system_version': '1.0.0',
                'data_sources': ['satellite', 'weather', 'irrigation_records']
            }
        }
        
        return export_data

    def _load_zones(self):
        """Load zones from file"""
        try:
            zones_file = Path("data/zones.json")
            if zones_file.exists():
                with open(zones_file, 'r') as f:
                    zones_data = json.load(f)
                    for zone_data in zones_data:
                        zone = Zone(
                            zone_id=zone_data['zone_id'],
                            name=zone_data['name'],
                            geometry=zone_data['geometry'],
                            crop_type=zone_data['crop_type'],
                            irrigation_type=zone_data['irrigation_type']
                        )
                        zone.soil_type = zone_data.get('soil_type')
                        zone.planting_date = zone_data.get('planting_date')
                        zone.expected_harvest_date = zone_data.get('expected_harvest_date')
                        zone.cached_satellite = zone_data.get('cached_satellite')
                        zone.irrigation_history = zone_data.get('irrigation_history', [])
                        self.zones[zone.zone_id] = zone
        except Exception as e:
            print(f"Error loading zones: {e}")

    def _save_zones(self):
        """Save zones to file"""
        try:
            zones_file = Path("data/zones.json")
            zones_file.parent.mkdir(parents=True, exist_ok=True)
            with open(zones_file, 'w') as f:
                json.dump([zone.to_dict() for zone in self.zones.values()], f, indent=2)
        except Exception as e:
            print(f"Error saving zones: {e}")
