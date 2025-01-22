import ee
import os
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

def initialize_gee():
    try:
        credentials = ee.ServiceAccountCredentials(
            os.getenv('GEE_SERVICE_ACCOUNT'),
            os.getenv('GEE_PRIVATE_KEY_FILE')
        )
        ee.Initialize(credentials)
        logger.info("GEE initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing GEE: {str(e)}")
        raise

def analyze_area(geometry):
    """Analyze an area using Google Earth Engine."""
    try:
        # Convert the GeoJSON geometry to GEE geometry
        area = ee.Geometry(geometry)
        
        # Get current date and date from 10 days ago
        end_date = datetime.now()
        start_date = end_date - timedelta(days=10)
        
        # Load Sentinel-2 collection
        s2 = ee.ImageCollection('COPERNICUS/S2_SR') \
            .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')) \
            .filterBounds(area) \
            .sort('CLOUDY_PIXEL_PERCENTAGE') \
            .first()
        
        # Calculate NDVI
        ndvi = s2.normalizedDifference(['B8', 'B4'])
        
        # Load soil moisture data (ERA5-Land hourly)
        soil_moisture = ee.ImageCollection('ECMWF/ERA5_LAND/HOURLY') \
            .select('swvl1') \
            .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d')) \
            .mean()
        
        # Calculate statistics for the area
        ndvi_stats = ndvi.reduceRegion(
            reducer=ee.Reducer.mean().combine(ee.Reducer.stdDev(), '', True),
            geometry=area,
            scale=10,
            maxPixels=1e9
        ).getInfo()
        
        soil_moisture_stats = soil_moisture.reduceRegion(
            reducer=ee.Reducer.mean().combine(ee.Reducer.stdDev(), '', True),
            geometry=area,
            scale=1000,
            maxPixels=1e9
        ).getInfo()
        
        # Get land use classification
        landcover = ee.ImageCollection('ESA/WorldCover/v200') \
            .first() \
            .clip(area)
        
        landcover_stats = landcover.reduceRegion(
            reducer=ee.Reducer.frequencyHistogram(),
            geometry=area,
            scale=10,
            maxPixels=1e9
        ).getInfo()
        
        return {
            'ndvi': {
                'mean': ndvi_stats.get('nd_mean', 0),
                'stdDev': ndvi_stats.get('nd_stdDev', 0)
            },
            'soilMoisture': {
                'mean': soil_moisture_stats.get('swvl1_mean', 0) * 100,  # Convert to percentage
                'stdDev': soil_moisture_stats.get('swvl1_stdDev', 0) * 100
            },
            'landcover': landcover_stats,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error analyzing area with GEE: {str(e)}")
        raise
