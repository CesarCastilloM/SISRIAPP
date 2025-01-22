from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest
import redis
import json
import os
from dotenv import load_dotenv
import logging
from logging.handlers import RotatingFileHandler
import threading
import queue
import time

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
handler = RotatingFileHandler('app.log', maxBytes=10000000, backupCount=5)
handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
))
app.logger.addHandler(handler)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Redis configuration for caching
redis_client = redis.Redis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    db=0,
    decode_responses=True
)

# Constants
CACHE_TIMEOUT = 300  # 5 minutes
ANOMALY_THRESHOLD = -0.5
MAX_QUEUE_SIZE = 1000

# Initialize processing queues
sensor_data_queue = queue.Queue(maxsize=MAX_QUEUE_SIZE)
irrigation_queue = queue.Queue(maxsize=MAX_QUEUE_SIZE)

# Database Models
class SensorData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    zone_id = db.Column(db.Integer, nullable=False)
    moisture = db.Column(db.Float)
    temperature = db.Column(db.Float)
    humidity = db.Column(db.Float)
    solar_radiation = db.Column(db.Float)
    flow_rate = db.Column(db.Float)
    total_water = db.Column(db.Float)
    errors = db.Column(db.Integer)

class IrrigationSchedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    zone_id = db.Column(db.Integer, nullable=False)
    start_time = db.Column(db.DateTime, nullable=False)
    duration = db.Column(db.Integer, nullable=False)  # in minutes
    water_amount = db.Column(db.Float)
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Caching decorator
def cache_with_timeout(timeout=CACHE_TIMEOUT):
    def decorator(f):
        def wrapper(*args, **kwargs):
            cache_key = f.__name__ + str(args) + str(kwargs)
            result = redis_client.get(cache_key)
            
            if result is not None:
                return json.loads(result)
            
            result = f(*args, **kwargs)
            redis_client.setex(cache_key, timeout, json.dumps(result))
            return result
        return wrapper
    return decorator

# Background processing functions
def process_sensor_data():
    while True:
        try:
            data_batch = []
            while not sensor_data_queue.empty() and len(data_batch) < 100:
                data_batch.append(sensor_data_queue.get_nowait())
            
            if data_batch:
                # Prepare data for anomaly detection
                X = np.array([[d['moisture'], d['temperature'], d['humidity']] for d in data_batch])
                scaler = StandardScaler()
                X_scaled = scaler.fit_transform(X)
                
                # Detect anomalies
                iso_forest = IsolationForest(contamination=0.1, random_state=42)
                anomalies = iso_forest.fit_predict(X_scaled)
                
                # Process and store data
                with app.app_context():
                    for data, is_anomaly in zip(data_batch, anomalies):
                        if is_anomaly == -1:
                            app.logger.warning(f"Anomaly detected in zone {data['zone_id']}")
                        
                        sensor_data = SensorData(**data)
                        db.session.add(sensor_data)
                    
                    db.session.commit()
            
            time.sleep(1)
        except Exception as e:
            app.logger.error(f"Error processing sensor data: {str(e)}")

def process_irrigation_schedule():
    while True:
        try:
            current_time = datetime.utcnow()
            
            with app.app_context():
                # Get pending schedules
                pending_schedules = IrrigationSchedule.query.filter_by(
                    status='pending'
                ).filter(
                    IrrigationSchedule.start_time <= current_time
                ).all()
                
                for schedule in pending_schedules:
                    # Check soil moisture before irrigation
                    latest_sensor_data = SensorData.query.filter_by(
                        zone_id=schedule.zone_id
                    ).order_by(SensorData.timestamp.desc()).first()
                    
                    if latest_sensor_data and latest_sensor_data.moisture > 80:
                        schedule.status = 'skipped'
                        app.logger.info(f"Skipping irrigation for zone {schedule.zone_id} - soil moisture sufficient")
                        continue
                    
                    schedule.status = 'active'
                    
                db.session.commit()
            
            time.sleep(60)
        except Exception as e:
            app.logger.error(f"Error processing irrigation schedule: {str(e)}")

# Start background processing threads
sensor_thread = threading.Thread(target=process_sensor_data, daemon=True)
irrigation_thread = threading.Thread(target=process_irrigation_schedule, daemon=True)
sensor_thread.start()
irrigation_thread.start()

# API Routes
@app.route('/api/update', methods=['POST'])
def update_sensor_data():
    try:
        data = request.json
        sensor_data_queue.put(data)
        return jsonify({'status': 'success'}), 200
    except Exception as e:
        app.logger.error(f"Error updating sensor data: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/schedule', methods=['POST'])
def create_schedule():
    try:
        data = request.json
        schedule = IrrigationSchedule(**data)
        db.session.add(schedule)
        db.session.commit()
        return jsonify({'status': 'success', 'id': schedule.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/schedule/<int:schedule_id>', methods=['DELETE'])
def delete_schedule(schedule_id):
    try:
        schedule = IrrigationSchedule.query.get_or_404(schedule_id)
        db.session.delete(schedule)
        db.session.commit()
        return jsonify({'status': 'success'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/water-usage', methods=['GET'])
@cache_with_timeout(3600)  # Cache for 1 hour
def get_water_usage():
    try:
        days = int(request.args.get('days', 7))
        start_date = datetime.utcnow() - timedelta(days=days)
        
        usage_data = db.session.query(
            SensorData.zone_id,
            db.func.sum(SensorData.total_water).label('total_usage'),
            db.func.avg(SensorData.flow_rate).label('avg_flow_rate')
        ).filter(
            SensorData.timestamp >= start_date
        ).group_by(
            SensorData.zone_id
        ).all()
        
        return jsonify([{
            'zone_id': data.zone_id,
            'total_usage': float(data.total_usage),
            'avg_flow_rate': float(data.avg_flow_rate)
        } for data in usage_data]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analytics/efficiency', methods=['GET'])
@cache_with_timeout(3600)  # Cache for 1 hour
def get_irrigation_efficiency():
    try:
        days = int(request.args.get('days', 7))
        start_date = datetime.utcnow() - timedelta(days=days)
        
        efficiency_data = db.session.query(
            SensorData.zone_id,
            db.func.avg(SensorData.moisture).label('avg_moisture'),
            db.func.avg(SensorData.solar_radiation).label('avg_radiation')
        ).filter(
            SensorData.timestamp >= start_date
        ).group_by(
            SensorData.zone_id
        ).all()
        
        return jsonify([{
            'zone_id': data.zone_id,
            'avg_moisture': float(data.avg_moisture),
            'avg_radiation': float(data.avg_radiation),
            'efficiency_score': calculate_efficiency_score(
                float(data.avg_moisture),
                float(data.avg_radiation)
            )
        } for data in efficiency_data]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def calculate_efficiency_score(moisture, radiation):
    # Implement your efficiency calculation logic here
    # This is a simplified example
    optimal_moisture = 60  # Optimal soil moisture percentage
    moisture_score = 100 - abs(moisture - optimal_moisture)
    radiation_factor = min(radiation / 1000, 1)  # Normalize radiation
    return (moisture_score * radiation_factor) / 100

if __name__ == '__main__':
    # Create database tables
    with app.app_context():
        db.create_all()
    
    # Start the Flask application
    app.run(host='0.0.0.0', port=5000, debug=os.getenv('FLASK_DEBUG', 'False').lower() == 'true')
