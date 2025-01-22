from typing import Dict, Optional
from datetime import datetime, timedelta
from backend.services.weather_service import WeatherService
from backend.services.satellite_service import SatelliteService
from backend.services.zone_service import ZoneService

class IrrigationService:
    def __init__(self, weather_service: WeatherService, satellite_service: SatelliteService, zone_service: ZoneService):
        self.weather_service = weather_service
        self.satellite_service = satellite_service
        self.zone_service = zone_service

    async def get_irrigation_recommendation(self, zone_id: str) -> Dict:
        """Get irrigation recommendation for a specific zone"""
        # Get zone data
        zone_data = await self.zone_service.get_zone_data(zone_id, force_refresh=True)
        if not zone_data:
            return {"status": "error", "message": "Zone not found"}

        zone = zone_data["zone"]
        weather = zone_data["weather"]
        satellite = zone_data["satellite"]

        # Get current conditions
        current_moisture = satellite["soil_moisture"]["mean"]
        current_temp = weather["temperature"]
        rain_probability = weather["precipitation_probability"]
        daily_eto = weather.get("eto", 0)

        # Get zone parameters
        target_moisture = zone.get("target_moisture")
        field_capacity = zone.get("field_capacity")
        wilting_point = zone.get("wilting_point")

        # Calculate irrigation need
        if all([target_moisture, field_capacity, wilting_point]):
            moisture_deficit = target_moisture - current_moisture
            irrigation_need = max(0, moisture_deficit)
        else:
            # Fallback calculation if parameters not set
            irrigation_need = max(0, 30 - current_moisture)  # Assume 30% is ideal

        # Get weather forecast
        forecast = weather.get("forecast", [])
        expected_rain = sum(day.get("precipitation", 0) for day in forecast[:3])  # Next 3 days

        # Determine recommendation
        should_irrigate = (
            irrigation_need > 0 and
            rain_probability < 60 and
            expected_rain < irrigation_need
        )

        # Calculate irrigation schedule
        schedule = []
        if should_irrigate:
            # Simple scheduling - irrigate in early morning if needed
            tomorrow = datetime.now() + timedelta(days=1)
            schedule.append({
                "date": tomorrow.date().isoformat(),
                "time": "06:00",
                "amount": irrigation_need
            })

        return {
            "zone_id": zone_id,
            "timestamp": datetime.now().isoformat(),
            "current_conditions": {
                "soil_moisture": current_moisture,
                "temperature": current_temp,
                "rain_probability": rain_probability,
                "daily_eto": daily_eto
            },
            "irrigation_need": irrigation_need,
            "expected_rain": expected_rain,
            "should_irrigate": should_irrigate,
            "schedule": schedule,
            "stress_level": satellite["water_stress"]["level"],
            "recommendation": "irrigate" if should_irrigate else "wait",
            "reason": (
                "Irrigation needed and no significant rain expected"
                if should_irrigate
                else "Adequate soil moisture or rain expected"
            )
        }

    async def apply_irrigation(self, zone_id: str, amount: float) -> Dict:
        """Apply irrigation to a zone"""
        # Record the irrigation event
        success = self.zone_service.record_irrigation(zone_id)
        if not success:
            return {"status": "error", "message": "Failed to record irrigation"}

        # Get updated zone data
        zone_data = await self.zone_service.get_zone_data(zone_id, force_refresh=True)
        
        return {
            "status": "success",
            "zone_id": zone_id,
            "amount": amount,
            "timestamp": datetime.now().isoformat(),
            "current_moisture": zone_data["satellite"]["soil_moisture"]["mean"]
        }
