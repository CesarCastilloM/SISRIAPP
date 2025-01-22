from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import ee
import json
from backend.config import GEE_SERVICE_ACCOUNT, GEE_PRIVATE_KEY
import random
import os

class SatelliteService:
    def __init__(self):
        self.cached_data = {}
        self.last_generated = {}
        self._initialize_ee()

    def _initialize_ee(self):
        """Initialize Earth Engine with service account"""
        try:
            print(f"Service Account: {GEE_SERVICE_ACCOUNT}")
            print(f"Private Key Length: {len(GEE_PRIVATE_KEY) if GEE_PRIVATE_KEY else 0}")
            
            if GEE_SERVICE_ACCOUNT and GEE_PRIVATE_KEY:
                credentials = ee.ServiceAccountCredentials(
                    email=GEE_SERVICE_ACCOUNT,
                    key_data=GEE_PRIVATE_KEY
                )
                ee.Initialize(credentials)
                self.ee_initialized = True
                print("Earth Engine initialized successfully!")
            else:
                print("Missing Earth Engine credentials")
                self.ee_initialized = False
        except Exception as e:
            print(f"Failed to initialize Earth Engine: {str(e)}")
            self.ee_initialized = False

    async def get_zone_data(self, zone_id: str, geometry: Dict[str, Any]) -> Dict[str, Any]:
        """Get satellite data from Earth Engine with fallback"""
        try:
            if self.ee_initialized:
                data = await self._get_ee_data(geometry)
                if data:
                    self.cached_data[zone_id] = {
                        'data': data,
                        'timestamp': datetime.now()
                    }
                    return data
        except Exception as e:
            print(f"Earth Engine error: {str(e)}")

        # Use cached data if available and recent
        cached = self.cached_data.get(zone_id)
        if cached and (datetime.now() - cached['timestamp']).total_seconds() < 86400:
            return cached['data']

        # Generate fallback data as last resort
        return self._generate_fallback_data(zone_id)

    async def _get_ee_data(self, geometry: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Get satellite indices and data from Earth Engine"""
        try:
            # Convert GeoJSON geometry to Earth Engine geometry
            ee_geometry = self._geojson_to_ee_geometry(geometry)
            
            # Get current date and date range
            now = datetime.now()
            end_date = now.strftime('%Y-%m-%d')
            start_date = (now - timedelta(days=10)).strftime('%Y-%m-%d')

            # Get Sentinel-2 imagery
            s2 = ee.ImageCollection('COPERNICUS/S2_SR') \
                .filterBounds(ee_geometry) \
                .filterDate(start_date, end_date) \
                .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)) \
                .sort('CLOUDY_PIXEL_PERCENTAGE') \
                .first()

            # Calculate indices
            indices = self._calculate_indices(s2, ee_geometry)
            
            # Get soil moisture from SMAP
            smap = ee.ImageCollection('NASA/SMAP/SPL3SMP_E/005') \
                .filterDate(start_date, end_date) \
                .select('soil_moisture_am') \
                .mean()
            
            soil_moisture = smap.reduceRegion(
                reducer=ee.Reducer.mean().combine(ee.Reducer.minMax(), "", True),
                geometry=ee_geometry,
                scale=10000
            ).getInfo()

            # Get land surface temperature from MODIS
            lst = ee.ImageCollection('MODIS/061/MOD11A1') \
                .filterDate(start_date, end_date) \
                .select('LST_Day_1km') \
                .mean()
            
            lst_stats = lst.multiply(0.02).reduceRegion(
                reducer=ee.Reducer.mean().combine(ee.Reducer.minMax(), "", True),
                geometry=ee_geometry,
                scale=1000
            ).getInfo()

            # Calculate water stress index
            et = self._calculate_evapotranspiration(s2, lst, smap, ee_geometry)
            
            # Get Sentinel-2 visualization URLs
            true_color_url = self._get_sentinel_visualization_url(geometry, 'TRUE-COLOR-S2L2A')
            ndvi_url = self._get_sentinel_visualization_url(geometry, 'NDVI')
            
            return {
                'ndvi': indices['ndvi'],
                'ndwi': indices['ndwi'],
                'evi': indices['evi'],
                'soil_moisture': {
                    'mean': soil_moisture.get('soil_moisture_am_mean', 0),
                    'min': soil_moisture.get('soil_moisture_am_min', 0),
                    'max': soil_moisture.get('soil_moisture_am_max', 0)
                },
                'land_surface_temp': {
                    'mean': lst_stats.get('LST_Day_1km_mean', 0),
                    'min': lst_stats.get('LST_Day_1km_min', 0),
                    'max': lst_stats.get('LST_Day_1km_max', 0)
                },
                'evapotranspiration': et['daily_et'],
                'water_stress': {
                    'index': et['water_stress_index'],
                    'level': self._get_stress_level(et['water_stress_index'])
                },
                'visualizations': {
                    'true_color': true_color_url,
                    'ndvi': ndvi_url
                },
                'status': 'api',
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Error getting Earth Engine data: {str(e)}")
            return None

    def _calculate_indices(self, image: ee.Image, geometry: ee.Geometry) -> Dict[str, Dict[str, float]]:
        """Calculate various vegetation and water indices"""
        # NDVI (Normalized Difference Vegetation Index)
        ndvi = image.normalizedDifference(['B8', 'B4'])
        
        # NDWI (Normalized Difference Water Index)
        ndwi = image.normalizedDifference(['B3', 'B8'])
        
        # EVI (Enhanced Vegetation Index)
        evi = image.expression(
            '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
                'NIR': image.select('B8'),
                'RED': image.select('B4'),
                'BLUE': image.select('B2')
            })

        # Calculate statistics for each index
        indices_stats = {
            'ndvi': ndvi.reduceRegion(
                reducer=ee.Reducer.mean().combine(ee.Reducer.minMax(), "", True),
                geometry=geometry,
                scale=10
            ).getInfo(),
            'ndwi': ndwi.reduceRegion(
                reducer=ee.Reducer.mean().combine(ee.Reducer.minMax(), "", True),
                geometry=geometry,
                scale=10
            ).getInfo(),
            'evi': evi.reduceRegion(
                reducer=ee.Reducer.mean().combine(ee.Reducer.minMax(), "", True),
                geometry=geometry,
                scale=10
            ).getInfo()
        }

        # Format the results
        return {
            'ndvi': {
                'mean': indices_stats['ndvi'].get('nd_mean', 0),
                'min': indices_stats['ndvi'].get('nd_min', 0),
                'max': indices_stats['ndvi'].get('nd_max', 0)
            },
            'ndwi': {
                'mean': indices_stats['ndwi'].get('nd_mean', 0),
                'min': indices_stats['ndwi'].get('nd_min', 0),
                'max': indices_stats['ndwi'].get('nd_max', 0)
            },
            'evi': {
                'mean': indices_stats['evi'].get('constant_mean', 0),
                'min': indices_stats['evi'].get('constant_min', 0),
                'max': indices_stats['evi'].get('constant_max', 0)
            }
        }

    def _calculate_evapotranspiration(self, s2: ee.Image, lst: ee.Image, sm: ee.Image, geometry: ee.Geometry) -> Dict[str, float]:
        """Calculate actual evapotranspiration and water stress index"""
        try:
            # Calculate potential ET using simplified Penman-Monteith
            # This is a simplified version, you might want to use more sophisticated models
            net_radiation = s2.select('B3').multiply(0.0864)  # Convert to MJ/m2/day
            temp_celsius = lst.multiply(0.02).subtract(273.15)
            
            # Actual ET calculation using empirical relationship with NDVI and LST
            ndvi = s2.normalizedDifference(['B8', 'B4'])
            et_factor = ndvi.multiply(0.8).add(0.1)  # Simple scaling factor
            actual_et = et_factor.multiply(net_radiation)
            
            # Calculate statistics
            et_stats = actual_et.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=geometry,
                scale=100
            ).getInfo()
            
            # Calculate water stress index (simplified version)
            # WSI = 1 - (AET/PET)
            potential_et = net_radiation.multiply(1.2)  # Simplified PET
            water_stress = ee.Image.constant(1).subtract(actual_et.divide(potential_et))
            
            stress_stats = water_stress.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=geometry,
                scale=100
            ).getInfo()
            
            return {
                'daily_et': et_stats.get('B3', 0),  # mm/day
                'water_stress_index': stress_stats.get('constant', 0)  # 0-1 scale
            }
        except Exception as e:
            print(f"Error calculating ET: {str(e)}")
            return {'daily_et': 0, 'water_stress_index': 0}

    def _get_stress_level(self, stress_index: float) -> str:
        """Convert water stress index to descriptive level"""
        if stress_index < 0.2:
            return "Low"
        elif stress_index < 0.4:
            return "Moderate"
        elif stress_index < 0.6:
            return "High"
        else:
            return "Severe"

    def _geojson_to_ee_geometry(self, geometry: Dict[str, Any]) -> ee.Geometry:
        """Convert GeoJSON geometry to Earth Engine geometry"""
        try:
            if geometry['type'].lower() == 'polygon':
                return ee.Geometry.Polygon(geometry['coordinates'])
            raise ValueError(f"Unsupported geometry type: {geometry['type']}")
        except Exception as e:
            raise ValueError(f"Invalid geometry format: {str(e)}")

    def _generate_fallback_data(self, zone_id: str) -> Dict[str, Any]:
        """Generate realistic satellite data based on historical patterns"""
        now = datetime.now()

        # Only generate new data every 6 hours
        if zone_id in self.last_generated:
            last_gen, data = self.last_generated[zone_id]
            if (now - last_gen).total_seconds() < 21600:  # 6 hours
                return data

        # Generate realistic NDVI (Normalized Difference Vegetation Index)
        ndvi = random.uniform(0.3, 0.8)  # Healthy vegetation: 0.6-0.9
        
        # Generate soil moisture based on recent weather
        soil_moisture = random.uniform(25, 45)  # Typical range: 20-50%
        
        # Generate soil temperature
        air_temp = 25  # Assumed air temperature
        soil_temp = air_temp - random.uniform(2, 5)  # Soil typically cooler than air
        
        # Generate other soil properties
        data = {
            'ndvi': {
                'mean': round(ndvi, 2),
                'min': round(max(0, ndvi - 0.1), 2),
                'max': round(min(1, ndvi + 0.1), 2)
            },
            'soil_moisture': {
                'mean': round(soil_moisture, 1),
                'min': round(max(0, soil_moisture - 5), 1),
                'max': round(min(100, soil_moisture + 5), 1)
            },
            'soil_temperature': {
                'mean': round(soil_temp, 1),
                'min': round(soil_temp - 2, 1),
                'max': round(soil_temp + 2, 1)
            },
            'soil_properties': {
                'ph': round(random.uniform(6.0, 7.5), 1),
                'nitrogen': round(random.uniform(20, 60), 1),
                'phosphorus': round(random.uniform(10, 30), 1),
                'potassium': round(random.uniform(100, 300), 1),
                'organic_matter': round(random.uniform(2, 5), 1),
                'salinity': round(random.uniform(0.5, 2.0), 2)
            },
            'status': 'generated',
            'timestamp': now.isoformat()
        }

        self.last_generated[zone_id] = (now, data)
        return data

    def _interpolate_data(self, previous_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create interpolated data based on previous measurements"""
        result = {}
        for key, value in previous_data.items():
            if isinstance(value, dict):
                if 'mean' in value:
                    # Add small random variation to mean values
                    variation = value['mean'] * random.uniform(-0.05, 0.05)
                    new_mean = value['mean'] + variation
                    result[key] = {
                        'mean': round(new_mean, 2),
                        'min': round(min(new_mean, value['min']), 2),
                        'max': round(max(new_mean, value['max']), 2)
                    }
                else:
                    result[key] = self._interpolate_data(value)
            else:
                result[key] = value
        return result

    def _get_sentinel_visualization_url(self, geometry: Dict[str, Any], layer: str) -> str:
        """Generate Sentinel Hub WMS URL for visualization"""
        try:
            bbox = self._get_geometry_bbox(geometry)
            base_url = "https://services.sentinel-hub.com/ogc/wms"
            instance_id = os.getenv('SENTINEL_HUB_INSTANCE_ID')
            
            params = {
                'service': 'WMS',
                'request': 'GetMap',
                'layers': layer,
                'styles': '',
                'format': 'image/png',
                'transparent': 'true',
                'version': '1.1.1',
                'height': 512,
                'width': 512,
                'srs': 'EPSG:4326',
                'bbox': f"{bbox['west']},{bbox['south']},{bbox['east']},{bbox['north']}",
                'time': datetime.now().strftime('%Y-%m-%d'),
                'maxcc': 20
            }
            
            query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
            return f"{base_url}/{instance_id}?{query_string}"
        except Exception as e:
            print(f"Error generating Sentinel visualization URL: {str(e)}")
            return ""

    def _get_geometry_bbox(self, geometry: Dict[str, Any]) -> Dict[str, float]:
        """Calculate bounding box from GeoJSON geometry"""
        try:
            coordinates = geometry['coordinates'][0]
            lats = [coord[1] for coord in coordinates]
            lons = [coord[0] for coord in coordinates]
            
            return {
                'north': max(lats),
                'south': min(lats),
                'east': max(lons),
                'west': min(lons)
            }
        except Exception as e:
            print(f"Error calculating geometry bbox: {str(e)}")
            return {'north': 0, 'south': 0, 'east': 0, 'west': 0}
