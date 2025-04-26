from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import logging

# Import from the new modular structure
from backend.src.config import API_TITLE, API_DESCRIPTION, API_VERSION
from backend.src.api.websockets import (
    process_audio_websocket,
    audio_to_text_websocket,
    flag_concept_websocket,
    flagged_history_websocket,
    evaluate_understanding_websocket
)
from backend.src.api.routes import router as api_router
from backend.src.database.db import init_db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=API_TITLE,
    description=API_DESCRIPTION,
    version=API_VERSION
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")

# WebSocket endpoints
@app.websocket("/ws/process-audio")
async def process_audio_ws_endpoint(websocket: WebSocket):
    return await process_audio_websocket(websocket)

@app.websocket("/ws/audio-to-text")
async def audio_to_text_ws_endpoint(websocket: WebSocket):
    return await audio_to_text_websocket(websocket)

@app.websocket("/ws/flag-concept")
async def flag_concept_ws_endpoint(websocket: WebSocket):
    return await flag_concept_websocket(websocket)

@app.websocket("/ws/flagged-history")
async def flagged_history_ws_endpoint(websocket: WebSocket):
    return await flagged_history_websocket(websocket)

@app.websocket("/ws/evaluate-understanding")
async def evaluate_understanding_ws_endpoint(websocket: WebSocket):
    return await evaluate_understanding_websocket(websocket)

# Startup event to initialize database
@app.on_event("startup")
async def startup_event():
    try:
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}")

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