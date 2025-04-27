from fastapi import FastAPI, Depends, WebSocket, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
from google.oauth2 import id_token
from google.auth.transport import requests
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from models.user import User

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get allowed origins from environment variable or use default in development
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173,http://localhost:5174,https://clarifai.yourdomain.com").split(",")
logger.info(f"Allowed origins for CORS: {ALLOWED_ORIGINS}")

# Import database
from database.db import init_db

# Import API modules
from api.routes import router as api_router
from api.websockets import (
    process_audio_websocket, 
    audio_to_text_websocket,
    flag_concept_websocket,
    flagged_history_websocket,
    evaluate_understanding_websocket,
    lectures_websocket
)

# Create FastAPI app
app = FastAPI(
    title="ClarifAI Backend",
    description="Backend for ClarifAI audio processing and concept explanation",
    version="1.0.0"
)

# Mount frontend build for single-container deployment
from fastapi.staticfiles import StaticFiles
# Commenting out the following line because frontend/build directory doesn't exist
# app.mount("/", StaticFiles(directory="../frontend/build", html=True), name="static")

# Configure CORS - Updated to ensure CORS headers are properly set
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
    max_age=86400,  # Cache preflight requests for 24 hours
)

# Add API routers
app.include_router(api_router, prefix="/api")

# WebSocket endpoints
@app.websocket("/ws/process-audio")
async def websocket_process_audio(websocket: WebSocket):
    await process_audio_websocket(websocket)

@app.websocket("/ws/audio-to-text")
async def websocket_audio_to_text(websocket: WebSocket):
    await audio_to_text_websocket(websocket)

@app.websocket("/ws/flag-concept")
async def websocket_flag_concept(websocket: WebSocket):
    await flag_concept_websocket(websocket)

@app.websocket("/ws/flagged-history")
async def websocket_flagged_history(websocket: WebSocket):
    await flagged_history_websocket(websocket)

@app.websocket("/ws/evaluate-understanding")
async def websocket_evaluate_understanding(websocket: WebSocket):
    await evaluate_understanding_websocket(websocket)

# Add missing lectures WebSocket endpoint
@app.websocket("/ws/lectures")
async def websocket_lectures(websocket: WebSocket):
    await lectures_websocket(websocket)

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    # Initialize database connection
    logger.info("Initializing database connection...")
    db_init_success = await init_db()
    if db_init_success:
        logger.info("Database initialized successfully")
    else:
        logger.error("Failed to initialize database")

    # Initialize MongoDB connection
    try:
        client = AsyncIOMotorClient(os.getenv("MONGODB_URL"))
        await init_beanie(database=client[os.getenv("MONGODB_DB")], document_models=[User])
        logger.info("Connected to MongoDB")
    except Exception as e:
        logger.error(f"Error connecting to MongoDB: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    # Perform cleanup
    logger.info("Shutting down application...")

# Root endpoint for health check
@app.get("/")
async def root():
    return {"status": "ok", "message": "ClarifAI backend is running"}

# Add CORS preflight handler for OPTIONS requests
@app.options("/{rest_of_path:path}")
async def preflight_handler(request: Request, rest_of_path: str):
    from fastapi.responses import JSONResponse
    response = JSONResponse(content={})
    
    # Get origin from request or default to localhost:3000
    origin = request.headers.get("origin", "http://localhost:3000")
    
    # Add CORS headers manually
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Expose-Headers"] = "Content-Type, Authorization, X-Requested-With, Accept, Origin"
    
    return response

# Add direct debug token endpoint with CORS
@app.get("/api/debug-direct/token")
async def debug_direct_token(request: Request):
    from api.routes import create_access_token
    from datetime import timedelta
    
    try:
        # Create a debug token
        access_token = create_access_token(
            data={"sub": "test@example.com"}, expires_delta=timedelta(days=30)
        )
        
        # Create response with explicit CORS headers
        from fastapi.responses import JSONResponse
        response = JSONResponse(content={"access_token": access_token, "token_type": "bearer"})
        
        # Get origin from request
        origin = request.headers.get("origin", "http://localhost:3000")
        
        # Add CORS headers manually - make sure to handle localhost:3000
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Expose-Headers"] = "Content-Type, Authorization, X-Requested-With, Accept, Origin"
        
        return response
    except Exception as e:
        logger.error(f"Error in debug-direct token endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class UserData(BaseModel):
    email: str
    name: Optional[str] = None

async def verify_firebase_token(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No token provided")
    
    token = auth_header.split("Bearer ")[1]
    try:
        # Use verify_firebase_token instead of verify_oauth2_token
        decoded_token = id_token.verify_firebase_token(
            token, 
            requests.Request(), 
            audience="clarifai-5f201"  # Your Firebase project ID
        )
        return decoded_token
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

def split_name(full_name: str):
    if not full_name:
        return None, None
    parts = full_name.strip().split()
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])

@app.post("/api/users/from-firebase")
async def create_user_from_firebase(
    user_data: UserData,
    decoded_token: dict = Depends(verify_firebase_token)
):
    try:
        # Verify the email matches the token
        if user_data.email != decoded_token.get("email"):
            raise HTTPException(status_code=401, detail="Email mismatch")
        
        first_name, last_name = split_name(user_data.name)
        # Create or update user in MongoDB
        user = await User.find_one({"email": user_data.email})
        if user:
            # Update existing user
            user.name = user_data.name
            user.first_name = first_name
            user.last_name = last_name
            await user.save()
        else:
            # Create new user
            user = User(
                email=user_data.email,
                name=user_data.name,
                firebase_uid=decoded_token.get("sub"),
                first_name=first_name,
                last_name=last_name
            )
            await user.save()
        
        return {"message": "User created/updated successfully", "user": user}
    except Exception as e:
        logger.error(f"Error creating/updating user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    import argparse
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Start the FastAPI server")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind to")
    args = parser.parse_args()
    
    # Start server with provided arguments
    uvicorn.run(
        app, 
        host=args.host, 
        port=args.port,
        forwarded_allow_ips="*",  # Trust forwarded headers from all IPs
        proxy_headers=True        # Process proxy headers
    ) 