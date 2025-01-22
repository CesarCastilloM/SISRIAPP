# Smart Irrigation System (SISRIAPP)

A modern, intelligent irrigation management system that combines IoT sensors, weather data, and machine learning to optimize water usage in agricultural settings.

## Project Structure

```
SISRIAPP/
├── frontend/                 # React frontend application
│   ├── src/                 # Source code
│   │   ├── components/      # React components
│   │   ├── styles/         # CSS styles
│   │   └── services/       # API services
│   ├── public/             # Static files
│   └── package.json        # Frontend dependencies
├── backend/                 # FastAPI backend application
│   ├── api/                # API endpoints
│   ├── models/             # Database models
│   ├── services/           # Business logic
│   ├── schemas/            # Pydantic schemas
│   └── requirements.txt    # Backend dependencies
├── .env                    # Environment variables (not in git)
├── .env.example           # Example environment variables
└── README.md              # Project documentation
```

## Features

- Real-time sensor data monitoring
- Weather integration
- Smart irrigation scheduling
- Field zone management
- Soil analysis
- Water usage optimization
- Mobile-responsive interface

## Prerequisites

- Python 3.8+
- Node.js 16+
- PostgreSQL 13+

## Setup Instructions

### Backend Setup

1. Create a virtual environment:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

### Frontend Setup

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start development server:
   ```bash
   npm start
   ```

## API Endpoints

### Zone Management
- GET `/api/zones/aggregated` - Get comprehensive data for all zones
- GET `/api/zones/{zone_id}` - Get specific zone data
- POST `/api/zones` - Create new zone
- PUT `/api/zones/{zone_id}` - Update zone

### Sensor Data
- GET `/api/zones/{zone_id}/sensors` - Get sensor readings
- GET `/api/zones/{zone_id}/weather` - Get weather data

### Irrigation Control
- POST `/api/zones/{zone_id}/irrigate` - Trigger irrigation
- GET `/api/zones/{zone_id}/schedule` - Get irrigation schedule

## Environment Variables

```env
# Backend
DATABASE_URL=postgresql://user:password@localhost:5432/sisriapp
SECRET_KEY=your-secret-key
WEATHER_API_KEY=your-weather-api-key

# Frontend
REACT_APP_API_URL=http://localhost:8000
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
