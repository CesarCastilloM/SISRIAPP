import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
import joblib
import cv2
import tensorflow as tf
from datetime import datetime, timedelta

class CropHealthAnalyzer:
    def __init__(self):
        self.disease_classifier = RandomForestClassifier(n_estimators=100)
        self.anomaly_detector = IsolationForest(contamination=0.1)
        self.growth_predictor = self._build_lstm_model()
        self.scaler = StandardScaler()
        
    def _build_lstm_model(self):
        model = Sequential([
            LSTM(64, return_sequences=True, input_shape=(30, 8)),
            Dropout(0.2),
            LSTM(32),
            Dropout(0.2),
            Dense(16, activation='relu'),
            Dense(1, activation='sigmoid')
        ])
        model.compile(optimizer='adam', loss='mse')
        return model

    def analyze_ndvi_image(self, image_path):
        """Analyze NDVI (Normalized Difference Vegetation Index) from satellite/drone imagery"""
        img = cv2.imread(image_path)
        nir = img[:,:,0].astype(float)
        red = img[:,:,2].astype(float)
        
        # Avoid division by zero
        denominator = nir + red
        denominator[denominator == 0] = 0.01
        
        ndvi = (nir - red) / denominator
        
        return {
            'mean_ndvi': np.mean(ndvi),
            'min_ndvi': np.min(ndvi),
            'max_ndvi': np.max(ndvi),
            'stress_areas': np.sum(ndvi < 0.2) / ndvi.size * 100
        }

    def predict_disease_probability(self, sensor_data):
        """Predict probability of crop diseases based on environmental conditions"""
        features = np.array([
            sensor_data['temperature'],
            sensor_data['humidity'],
            sensor_data['soil_moisture'],
            sensor_data['soil_ph'],
            sensor_data['nitrogen'],
            sensor_data['phosphorus'],
            sensor_data['potassium']
        ]).reshape(1, -1)
        
        # Scale features
        features_scaled = self.scaler.transform(features)
        
        # Get disease probability
        disease_prob = self.disease_classifier.predict_proba(features_scaled)
        
        return {
            'disease_probability': disease_prob[0][1],
            'risk_level': 'High' if disease_prob[0][1] > 0.7 else 'Medium' if disease_prob[0][1] > 0.3 else 'Low',
            'contributing_factors': self._identify_risk_factors(features[0])
        }

    def predict_growth_stage(self, historical_data):
        """Predict crop growth stage and future development"""
        sequence_length = 30
        features = self._prepare_sequence(historical_data, sequence_length)
        
        if features is None:
            return None
            
        prediction = self.growth_predictor.predict(features)
        
        return {
            'current_stage': self._map_growth_stage(prediction[0][0]),
            'days_to_next_stage': self._estimate_days_to_next_stage(prediction[0][0]),
            'growth_rate': self._calculate_growth_rate(historical_data)
        }

    def detect_stress_conditions(self, sensor_data, weather_forecast):
        """Detect and predict plant stress conditions"""
        current_conditions = np.array([
            sensor_data['temperature'],
            sensor_data['humidity'],
            sensor_data['soil_moisture'],
            sensor_data['solar_radiation'],
            weather_forecast['temperature_next_24h'],
            weather_forecast['humidity_next_24h'],
            weather_forecast['precipitation_probability']
        ]).reshape(1, -1)
        
        # Detect anomalies
        stress_prediction = self.anomaly_detector.predict(current_conditions)
        
        stress_factors = []
        if sensor_data['temperature'] > 30:
            stress_factors.append({
                'factor': 'High Temperature',
                'value': sensor_data['temperature'],
                'threshold': 30,
                'recommendation': 'Consider increasing irrigation frequency'
            })
            
        if sensor_data['soil_moisture'] < 20:
            stress_factors.append({
                'factor': 'Low Soil Moisture',
                'value': sensor_data['soil_moisture'],
                'threshold': 20,
                'recommendation': 'Immediate irrigation needed'
            })
            
        return {
            'stress_detected': stress_prediction[0] == -1,
            'stress_factors': stress_factors,
            'stress_probability': self._calculate_stress_probability(current_conditions[0]),
            'recommended_actions': self._generate_stress_recommendations(stress_factors)
        }

    def _identify_risk_factors(self, features):
        """Identify environmental factors contributing to disease risk"""
        risk_factors = []
        thresholds = {
            'temperature': (15, 30),
            'humidity': (60, 80),
            'soil_moisture': (20, 80),
            'soil_ph': (6.0, 7.5),
            'nitrogen': (20, 40),
            'phosphorus': (20, 40),
            'potassium': (20, 40)
        }
        
        for i, (factor, (min_val, max_val)) in enumerate(thresholds.items()):
            if features[i] < min_val or features[i] > max_val:
                risk_factors.append({
                    'factor': factor,
                    'value': features[i],
                    'optimal_range': f'{min_val}-{max_val}',
                    'severity': 'High' if abs(features[i] - (min_val + max_val)/2) > (max_val - min_val)/2 else 'Medium'
                })
                
        return risk_factors

    def _prepare_sequence(self, historical_data, sequence_length):
        """Prepare time series data for LSTM model"""
        if len(historical_data) < sequence_length:
            return None
            
        sequences = []
        for i in range(len(historical_data) - sequence_length):
            sequences.append(historical_data[i:i+sequence_length])
            
        return np.array(sequences)

    def _map_growth_stage(self, prediction):
        """Map numerical prediction to growth stage"""
        stages = [
            'Germination',
            'Seedling',
            'Vegetative',
            'Flowering',
            'Fruit Development',
            'Maturation'
        ]
        
        stage_index = int(prediction * (len(stages) - 1))
        return stages[stage_index]

    def _estimate_days_to_next_stage(self, current_progress):
        """Estimate days until next growth stage"""
        average_stage_duration = 20  # days
        progress_in_current_stage = current_progress % (1.0/5)
        return int((1 - progress_in_current_stage) * average_stage_duration)

    def _calculate_growth_rate(self, historical_data):
        """Calculate current growth rate based on historical data"""
        recent_data = historical_data[-7:]  # Last week
        growth_indicators = [d['height'] for d in recent_data if 'height' in d]
        
        if len(growth_indicators) < 2:
            return None
            
        daily_growth = np.diff(growth_indicators).mean()
        return daily_growth

    def _calculate_stress_probability(self, conditions):
        """Calculate probability of plant stress based on current conditions"""
        weights = [0.3, 0.2, 0.2, 0.1, 0.1, 0.05, 0.05]
        normalized_conditions = (conditions - np.min(conditions)) / (np.max(conditions) - np.min(conditions))
        return np.sum(normalized_conditions * weights)

    def _generate_stress_recommendations(self, stress_factors):
        """Generate specific recommendations based on stress factors"""
        recommendations = []
        
        for factor in stress_factors:
            if factor['factor'] == 'High Temperature':
                recommendations.extend([
                    'Increase irrigation frequency',
                    'Consider shade protection',
                    'Monitor for signs of heat stress'
                ])
            elif factor['factor'] == 'Low Soil Moisture':
                recommendations.extend([
                    'Immediate irrigation required',
                    'Apply mulch to reduce evaporation',
                    'Check irrigation system efficiency'
                ])
                
        return list(set(recommendations))  # Remove duplicates

    def save_models(self, path):
        """Save trained models"""
        joblib.dump(self.disease_classifier, f'{path}/disease_classifier.joblib')
        joblib.dump(self.anomaly_detector, f'{path}/anomaly_detector.joblib')
        self.growth_predictor.save(f'{path}/growth_predictor.h5')
        joblib.dump(self.scaler, f'{path}/scaler.joblib')

    def load_models(self, path):
        """Load trained models"""
        self.disease_classifier = joblib.load(f'{path}/disease_classifier.joblib')
        self.anomaly_detector = joblib.load(f'{path}/anomaly_detector.joblib')
        self.growth_predictor = tf.keras.models.load_model(f'{path}/growth_predictor.h5')
        self.scaler = joblib.load(f'{path}/scaler.joblib')
