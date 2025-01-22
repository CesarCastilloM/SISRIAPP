import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
import joblib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

class IrrigationPredictor:
    def __init__(self):
        self.model = GradientBoostingRegressor(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=4
        )
        self.scaler = StandardScaler()
        self.feature_importance: Dict[str, float] = {}
        
    def prepare_features(self, data: Dict) -> np.ndarray:
        """Prepare features for prediction"""
        features = np.array([
            data['temperature'],
            data['humidity'],
            data['soil_moisture'],
            data['precipitation_forecast'],
            data['solar_radiation'],
            data['wind_speed'],
            data['evapotranspiration'],
            data['crop_stage_normalized']
        ]).reshape(1, -1)
        
        return self.scaler.transform(features)
        
    def predict_irrigation_needs(
        self,
        current_conditions: Dict,
        weather_forecast: List[Dict],
        soil_data: Dict,
        crop_data: Dict
    ) -> Dict:
        """Predict irrigation requirements based on conditions"""
        # Prepare current features
        features = self.prepare_features({
            **current_conditions,
            **weather_forecast[0],
            **soil_data,
            'crop_stage_normalized': crop_data['growth_stage'] / 5.0
        })
        
        # Get base prediction
        base_water_needs = self.model.predict(features)[0]
        
        # Adjust for weather forecast
        adjusted_needs = self._adjust_for_forecast(
            base_water_needs,
            weather_forecast,
            soil_data['soil_type']
        )
        
        # Calculate efficiency factors
        efficiency_factors = self._calculate_efficiency_factors(
            current_conditions,
            soil_data,
            crop_data
        )
        
        # Generate schedule
        schedule = self._generate_irrigation_schedule(
            adjusted_needs,
            efficiency_factors,
            weather_forecast
        )
        
        return {
            'base_water_needs': base_water_needs,
            'adjusted_needs': adjusted_needs,
            'efficiency_factors': efficiency_factors,
            'schedule': schedule,
            'recommendations': self._generate_recommendations(
                adjusted_needs,
                efficiency_factors,
                weather_forecast
            )
        }
        
    def _adjust_for_forecast(
        self,
        base_needs: float,
        forecast: List[Dict],
        soil_type: str
    ) -> float:
        """Adjust irrigation needs based on weather forecast"""
        # Calculate precipitation impact
        total_precipitation = sum(day['precipitation_forecast'] for day in forecast[:3])
        
        # Soil type absorption factors
        absorption_factors = {
            'sandy': 0.8,
            'loamy': 0.9,
            'clay': 0.7,
            'silty': 0.85
        }
        
        soil_factor = absorption_factors.get(soil_type, 0.8)
        
        # Adjust based on precipitation and soil type
        adjusted_needs = base_needs - (total_precipitation * soil_factor)
        
        # Ensure non-negative
        return max(0, adjusted_needs)
        
    def _calculate_efficiency_factors(
        self,
        conditions: Dict,
        soil_data: Dict,
        crop_data: Dict
    ) -> Dict[str, float]:
        """Calculate various efficiency factors"""
        return {
            'soil_moisture_efficiency': self._calculate_soil_moisture_efficiency(
                soil_data['current_moisture'],
                soil_data['field_capacity']
            ),
            'time_of_day_efficiency': self._calculate_time_of_day_efficiency(
                conditions['solar_radiation'],
                conditions['temperature']
            ),
            'wind_efficiency': self._calculate_wind_efficiency(
                conditions['wind_speed']
            ),
            'growth_stage_factor': self._calculate_growth_stage_factor(
                crop_data['growth_stage']
            )
        }
        
    def _generate_irrigation_schedule(
        self,
        water_needs: float,
        efficiency_factors: Dict[str, float],
        forecast: List[Dict]
    ) -> List[Dict]:
        """Generate optimal irrigation schedule"""
        schedule = []
        remaining_water = water_needs
        
        # Get optimal times based on efficiency factors
        optimal_times = self._find_optimal_irrigation_times(
            efficiency_factors,
            forecast
        )
        
        for time_slot in optimal_times:
            if remaining_water <= 0:
                break
                
            water_amount = min(
                remaining_water,
                time_slot['max_capacity'] * efficiency_factors['time_of_day_efficiency']
            )
            
            schedule.append({
                'time': time_slot['time'],
                'duration_minutes': self._calculate_duration(water_amount),
                'water_amount': water_amount,
                'efficiency_score': time_slot['efficiency_score']
            })
            
            remaining_water -= water_amount
            
        return schedule
        
    def _find_optimal_irrigation_times(
        self,
        efficiency_factors: Dict[str, float],
        forecast: List[Dict]
    ) -> List[Dict]:
        """Find optimal irrigation times based on conditions"""
        optimal_times = []
        current_time = datetime.now()
        
        for hour in range(24):
            time_slot = current_time + timedelta(hours=hour)
            
            # Skip times with high probability of rain
            if any(f['precipitation_forecast'] > 0.5 for f in forecast if
                  f['time'].hour == time_slot.hour):
                continue
                
            efficiency_score = (
                efficiency_factors['time_of_day_efficiency'] *
                efficiency_factors['wind_efficiency'] *
                efficiency_factors['growth_stage_factor']
            )
            
            if efficiency_score > 0.7:  # Only consider efficient times
                optimal_times.append({
                    'time': time_slot,
                    'efficiency_score': efficiency_score,
                    'max_capacity': 10.0  # Maximum water amount per hour
                })
                
        return sorted(optimal_times, key=lambda x: x['efficiency_score'], reverse=True)
        
    def _calculate_duration(self, water_amount: float) -> int:
        """Calculate irrigation duration in minutes"""
        # Assume flow rate of 2 units per minute
        flow_rate = 2.0
        return int(water_amount / flow_rate)
        
    def _generate_recommendations(
        self,
        water_needs: float,
        efficiency_factors: Dict[str, float],
        forecast: List[Dict]
    ) -> List[str]:
        """Generate irrigation recommendations"""
        recommendations = []
        
        if water_needs > 20:
            recommendations.append(
                "High water requirement detected. Consider split irrigation sessions."
            )
            
        if efficiency_factors['soil_moisture_efficiency'] < 0.7:
            recommendations.append(
                "Soil moisture efficiency is low. Consider soil amendments or mulching."
            )
            
        if any(f['precipitation_forecast'] > 0.7 for f in forecast[:2]):
            recommendations.append(
                "High precipitation forecast. Consider delaying irrigation."
            )
            
        return recommendations
        
    @staticmethod
    def _calculate_soil_moisture_efficiency(
        current_moisture: float,
        field_capacity: float
    ) -> float:
        """Calculate soil moisture efficiency"""
        return min(1.0, current_moisture / field_capacity)
        
    @staticmethod
    def _calculate_time_of_day_efficiency(
        solar_radiation: float,
        temperature: float
    ) -> float:
        """Calculate time of day efficiency"""
        # Normalize values
        norm_radiation = min(1.0, solar_radiation / 1000.0)
        norm_temp = min(1.0, max(0.0, (temperature - 15) / 25))
        
        return 1.0 - (norm_radiation * 0.6 + norm_temp * 0.4)
        
    @staticmethod
    def _calculate_wind_efficiency(wind_speed: float) -> float:
        """Calculate wind efficiency factor"""
        # Assume optimal wind speed < 10 km/h
        return max(0.0, 1.0 - (wind_speed / 10.0))
        
    @staticmethod
    def _calculate_growth_stage_factor(growth_stage: int) -> float:
        """Calculate growth stage factor"""
        # Stages 2-4 typically need more water
        stage_factors = {
            1: 0.7,  # Early growth
            2: 1.0,  # Peak growth
            3: 1.0,  # Flowering
            4: 0.8,  # Fruit development
            5: 0.6   # Maturation
        }
        return stage_factors.get(growth_stage, 0.8)
        
    def save_model(self, path: str):
        """Save the trained model"""
        joblib.dump(self.model, f'{path}/irrigation_model.joblib')
        joblib.dump(self.scaler, f'{path}/irrigation_scaler.joblib')
        
    def load_model(self, path: str):
        """Load a trained model"""
        self.model = joblib.load(f'{path}/irrigation_model.joblib')
        self.scaler = joblib.load(f'{path}/irrigation_scaler.joblib')
