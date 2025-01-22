from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import cv2
from datetime import datetime, timedelta

@dataclass
class CropGrowthStage:
    name: str
    duration_days: Tuple[int, int]  # min, max days
    optimal_conditions: Dict[str, Tuple[float, float]]  # min, max values
    water_needs: float  # relative to base need (1.0)
    nutrient_needs: Dict[str, float]  # relative amounts
    stress_indicators: List[str]

@dataclass
class CropProfile:
    name: str
    variety: str
    growth_stages: List[CropGrowthStage]
    disease_susceptibility: Dict[str, float]
    climate_preferences: Dict[str, Tuple[float, float]]
    companion_plants: List[str]
    soil_preferences: Dict[str, Tuple[float, float]]

class CropPatternAnalyzer:
    def __init__(self):
        self._load_crop_profiles()
        self.disease_classifier = RandomForestClassifier(n_estimators=100)
        
    def _load_crop_profiles(self):
        """Load predefined crop profiles"""
        self.crop_profiles = {
            'tomato': {
                'determinate': CropProfile(
                    name='Tomato',
                    variety='Determinate',
                    growth_stages=[
                        CropGrowthStage(
                            name='Seedling',
                            duration_days=(14, 21),
                            optimal_conditions={
                                'temperature': (20, 25),
                                'humidity': (60, 70),
                                'soil_moisture': (65, 75)
                            },
                            water_needs=0.7,
                            nutrient_needs={
                                'nitrogen': 0.5,
                                'phosphorus': 0.8,
                                'potassium': 0.5
                            },
                            stress_indicators=[
                                'leaf_yellowing',
                                'stunted_growth'
                            ]
                        ),
                        CropGrowthStage(
                            name='Vegetative',
                            duration_days=(20, 30),
                            optimal_conditions={
                                'temperature': (21, 27),
                                'humidity': (65, 75),
                                'soil_moisture': (70, 80)
                            },
                            water_needs=1.0,
                            nutrient_needs={
                                'nitrogen': 1.0,
                                'phosphorus': 0.7,
                                'potassium': 0.8
                            },
                            stress_indicators=[
                                'leaf_curling',
                                'purple_stems'
                            ]
                        ),
                        CropGrowthStage(
                            name='Flowering',
                            duration_days=(20, 30),
                            optimal_conditions={
                                'temperature': (20, 24),
                                'humidity': (65, 80),
                                'soil_moisture': (65, 75)
                            },
                            water_needs=1.2,
                            nutrient_needs={
                                'nitrogen': 0.7,
                                'phosphorus': 1.0,
                                'potassium': 1.0
                            },
                            stress_indicators=[
                                'flower_drop',
                                'blossom_end_rot'
                            ]
                        ),
                        CropGrowthStage(
                            name='Fruiting',
                            duration_days=(20, 40),
                            optimal_conditions={
                                'temperature': (20, 25),
                                'humidity': (65, 75),
                                'soil_moisture': (70, 80)
                            },
                            water_needs=1.5,
                            nutrient_needs={
                                'nitrogen': 0.6,
                                'phosphorus': 0.8,
                                'potassium': 1.2
                            },
                            stress_indicators=[
                                'fruit_cracking',
                                'uneven_ripening'
                            ]
                        )
                    ],
                    disease_susceptibility={
                        'early_blight': 0.7,
                        'late_blight': 0.8,
                        'fusarium_wilt': 0.6,
                        'septoria_leaf_spot': 0.7
                    },
                    climate_preferences={
                        'temperature': (18, 28),
                        'humidity': (60, 80),
                        'light_hours': (6, 8)
                    },
                    companion_plants=[
                        'basil',
                        'marigold',
                        'carrots',
                        'onions'
                    ],
                    soil_preferences={
                        'ph': (6.0, 6.8),
                        'organic_matter': (3.0, 5.0),
                        'nitrogen': (50, 100),
                        'phosphorus': (50, 100),
                        'potassium': (50, 100)
                    }
                )
            },
            'lettuce': {
                'butterhead': CropProfile(
                    name='Lettuce',
                    variety='Butterhead',
                    growth_stages=[
                        CropGrowthStage(
                            name='Germination',
                            duration_days=(4, 7),
                            optimal_conditions={
                                'temperature': (15, 20),
                                'humidity': (65, 75),
                                'soil_moisture': (70, 80)
                            },
                            water_needs=0.8,
                            nutrient_needs={
                                'nitrogen': 0.6,
                                'phosphorus': 0.7,
                                'potassium': 0.5
                            },
                            stress_indicators=[
                                'poor_germination',
                                'damping_off'
                            ]
                        ),
                        CropGrowthStage(
                            name='Leaf Development',
                            duration_days=(21, 30),
                            optimal_conditions={
                                'temperature': (15, 22),
                                'humidity': (60, 70),
                                'soil_moisture': (65, 75)
                            },
                            water_needs=1.0,
                            nutrient_needs={
                                'nitrogen': 1.0,
                                'phosphorus': 0.6,
                                'potassium': 0.8
                            },
                            stress_indicators=[
                                'leaf_yellowing',
                                'tipburn'
                            ]
                        ),
                        CropGrowthStage(
                            name='Head Formation',
                            duration_days=(14, 21),
                            optimal_conditions={
                                'temperature': (15, 20),
                                'humidity': (60, 70),
                                'soil_moisture': (65, 75)
                            },
                            water_needs=1.2,
                            nutrient_needs={
                                'nitrogen': 0.8,
                                'phosphorus': 0.6,
                                'potassium': 1.0
                            },
                            stress_indicators=[
                                'bolting',
                                'loose_heads'
                            ]
                        )
                    ],
                    disease_susceptibility={
                        'downy_mildew': 0.8,
                        'bottom_rot': 0.6,
                        'lettuce_mosaic_virus': 0.7
                    },
                    climate_preferences={
                        'temperature': (15, 22),
                        'humidity': (60, 70),
                        'light_hours': (4, 6)
                    },
                    companion_plants=[
                        'carrots',
                        'radishes',
                        'cucumbers',
                        'onions'
                    ],
                    soil_preferences={
                        'ph': (6.0, 7.0),
                        'organic_matter': (2.0, 4.0),
                        'nitrogen': (40, 80),
                        'phosphorus': (30, 70),
                        'potassium': (40, 80)
                    }
                )
            }
        }
        
    def analyze_growth_stage(
        self,
        crop_name: str,
        variety: str,
        days_since_planting: int,
        current_conditions: Dict[str, float]
    ) -> Dict:
        """Analyze current growth stage and provide recommendations"""
        profile = self.crop_profiles[crop_name][variety]
        current_stage = None
        days_elapsed = 0
        
        # Find current growth stage
        for stage in profile.growth_stages:
            if days_elapsed <= days_since_planting <= (days_elapsed + stage.duration_days[1]):
                current_stage = stage
                break
            days_elapsed += stage.duration_days[1]
            
        if not current_stage:
            return {'error': 'Plant has exceeded expected growth duration'}
            
        # Analyze conditions
        condition_analysis = {}
        for condition, (min_val, max_val) in current_stage.optimal_conditions.items():
            if condition in current_conditions:
                current_val = current_conditions[condition]
                condition_analysis[condition] = {
                    'current': current_val,
                    'optimal_range': (min_val, max_val),
                    'status': 'optimal' if min_val <= current_val <= max_val else 'suboptimal',
                    'adjustment_needed': min_val - current_val if current_val < min_val else current_val - max_val if current_val > max_val else 0
                }
                
        return {
            'current_stage': current_stage.name,
            'days_in_stage': days_since_planting - days_elapsed,
            'days_remaining': current_stage.duration_days[1] - (days_since_planting - days_elapsed),
            'condition_analysis': condition_analysis,
            'water_needs': current_stage.water_needs,
            'nutrient_needs': current_stage.nutrient_needs,
            'stress_indicators': current_stage.stress_indicators
        }
        
    def detect_stress_indicators(
        self,
        image: np.ndarray,
        crop_name: str,
        variety: str,
        growth_stage: str
    ) -> Dict[str, float]:
        """Detect stress indicators from plant images"""
        # Convert to HSV color space for better color analysis
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        # Get relevant stress indicators for the current stage
        profile = self.crop_profiles[crop_name][variety]
        current_stage = next(
            (stage for stage in profile.growth_stages if stage.name == growth_stage),
            None
        )
        
        if not current_stage:
            return {'error': 'Invalid growth stage'}
            
        stress_analysis = {}
        
        for indicator in current_stage.stress_indicators:
            if indicator == 'leaf_yellowing':
                # Detect yellow colors
                yellow_lower = np.array([20, 100, 100])
                yellow_upper = np.array([30, 255, 255])
                yellow_mask = cv2.inRange(hsv, yellow_lower, yellow_upper)
                stress_analysis['leaf_yellowing'] = np.sum(yellow_mask) / (image.shape[0] * image.shape[1])
                
            elif indicator == 'leaf_curling':
                # Use contour analysis for leaf shape
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                edges = cv2.Canny(gray, 50, 150)
                contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                
                # Analyze contour complexity
                if len(contours) > 0:
                    complexity = sum(len(contour) for contour in contours) / len(contours)
                    stress_analysis['leaf_curling'] = min(1.0, complexity / 100)
                    
        return stress_analysis
        
    def recommend_companion_planting(
        self,
        crop_name: str,
        variety: str,
        available_space: float,
        existing_plants: List[str]
    ) -> List[Dict]:
        """Recommend companion plants based on available space and existing plants"""
        profile = self.crop_profiles[crop_name][variety]
        recommendations = []
        
        for companion in profile.companion_plants:
            if companion not in existing_plants:
                companion_profile = next(
                    (p for p in self.crop_profiles.values() for v in p.values() if v.name.lower() == companion),
                    None
                )
                
                if companion_profile:
                    recommendations.append({
                        'plant': companion,
                        'benefits': self._get_companion_benefits(crop_name, companion),
                        'space_required': self._estimate_space_requirement(companion),
                        'compatibility_score': self._calculate_compatibility_score(
                            profile, companion_profile, existing_plants
                        )
                    })
                    
        # Sort by compatibility score
        recommendations.sort(key=lambda x: x['compatibility_score'], reverse=True)
        
        return recommendations
        
    def _get_companion_benefits(self, main_crop: str, companion: str) -> List[str]:
        """Get benefits of companion planting combination"""
        benefits_db = {
            ('tomato', 'basil'): [
                'Pest repellent',
                'Flavor enhancement',
                'Growth stimulation'
            ],
            ('tomato', 'marigold'): [
                'Nematode control',
                'Pest repellent'
            ],
            ('lettuce', 'carrots'): [
                'Space optimization',
                'Soil conditioning'
            ]
        }
        
        return benefits_db.get((main_crop, companion), ['Compatible growing conditions'])
        
    def _estimate_space_requirement(self, plant: str) -> float:
        """Estimate space requirement for a plant in square meters"""
        space_requirements = {
            'basil': 0.2,
            'marigold': 0.15,
            'carrots': 0.1,
            'onions': 0.1,
            'radishes': 0.05
        }
        
        return space_requirements.get(plant, 0.25)
        
    def _calculate_compatibility_score(
        self,
        main_profile: CropProfile,
        companion_profile: CropProfile,
        existing_plants: List[str]
    ) -> float:
        """Calculate compatibility score between plants"""
        score = 0.0
        
        # Climate compatibility
        climate_score = 0
        for condition, (min1, max1) in main_profile.climate_preferences.items():
            if condition in companion_profile.climate_preferences:
                min2, max2 = companion_profile.climate_preferences[condition]
                overlap = min(max1, max2) - max(min1, min2)
                if overlap > 0:
                    climate_score += overlap / (max(max1, max2) - min(min1, min2))
                    
        score += climate_score / len(main_profile.climate_preferences)
        
        # Soil compatibility
        soil_score = 0
        for condition, (min1, max1) in main_profile.soil_preferences.items():
            if condition in companion_profile.soil_preferences:
                min2, max2 = companion_profile.soil_preferences[condition]
                overlap = min(max1, max2) - max(min1, min2)
                if overlap > 0:
                    soil_score += overlap / (max(max1, max2) - min(min1, min2))
                    
        score += soil_score / len(main_profile.soil_preferences)
        
        # Existing plants compatibility
        existing_score = 1.0
        for plant in existing_plants:
            if plant in companion_profile.companion_plants:
                existing_score *= 0.9  # Slight penalty for each existing companion
                
        score *= existing_score
        
        return score
