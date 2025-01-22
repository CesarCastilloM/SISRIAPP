from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from datetime import datetime
import logging
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

def setup_security(app: FastAPI):
    """Configure security middleware for the FastAPI application"""
    
    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",  # React development server
            "https://sisriapp.up.railway.app"  # Production domain
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Rate limiting
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    
    # Request logging middleware
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        # Log request
        start_time = datetime.now()
        path = request.url.path
        method = request.method
        client = request.client.host if request.client else "unknown"
        
        logger.info(f"Request: {method} {path} from {client}")
        
        # Process request
        try:
            response = await call_next(request)
            
            # Log response
            duration = (datetime.now() - start_time).total_seconds()
            logger.info(f"Response: {response.status_code} for {method} {path} ({duration:.2f}s)")
            
            return response
        except Exception as e:
            # Log error
            logger.error(f"Error processing {method} {path}: {str(e)}")
            raise
    
    # Input validation middleware
    @app.middleware("http")
    async def validate_json(request: Request, call_next):
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get('content-type', '')
            if 'application/json' in content_type:
                try:
                    await request.json()
                except json.JSONDecodeError:
                    raise HTTPException(status_code=400, detail="Invalid JSON")
        
        return await call_next(request)
    
    # JWT verification middleware
    @app.middleware("http")
    async def verify_jwt(request: Request, call_next):
        # Skip auth for public endpoints
        public_paths = ["/auth/login", "/auth/register", "/docs", "/openapi.json"]
        if request.url.path in public_paths:
            return await call_next(request)
        
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(
                status_code=401,
                detail="Missing or invalid authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # JWT verification is handled by auth_service
        return await call_next(request)
    
    logger.info("Security middleware configured successfully")
