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
from backend.src.models.user import User

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import database
from backend.src.database.db import init_db

# Import API modules
from backend.src.api.routes import router as api_router
from backend.src.api.websockets import (
    process_audio_websocket, 
    audio_to_text_websocket,
    flag_concept_websocket,
    flagged_history_websocket,
    evaluate_understanding_websocket
)

# Create FastAPI app
app = FastAPI(
    title="ClarifAI Backend",
    description="Backend for ClarifAI audio processing and concept explanation",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Update with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

@app.post("/api/users/from-firebase")
async def create_user_from_firebase(
    user_data: UserData,
    decoded_token: dict = Depends(verify_firebase_token)
):
    try:
        # Verify the email matches the token
        if user_data.email != decoded_token.get("email"):
            raise HTTPException(status_code=401, detail="Email mismatch")
        
        # Create or update user in MongoDB
        user = await User.find_one({"email": user_data.email})
        if user:
            # Update existing user
            user.name = user_data.name
            await user.save()
        else:
            # Create new user
            user = User(
                email=user_data.email,
                name=user_data.name,
                firebase_uid=decoded_token.get("sub")
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
    uvicorn.run(app, host=args.host, port=args.port) 