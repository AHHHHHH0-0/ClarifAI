from fastapi import FastAPI, Depends, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import logging
import os

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import database
from backend.src.database.db import init_db

# Import API modules
from backend.src.api.routes import router as api_router
from backend.src.api.websockets import (
    audio_to_text_websocket,
    flag_concept_websocket,
    flagged_history_websocket,
    evaluate_understanding_websocket,
    teach_to_learn_websocket
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
    allow_origins=["*"],  # In production, restrict this to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add API routers
app.include_router(api_router, prefix="/api")

# WebSocket endpoints
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

@app.websocket("/ws/teach-to-learn")
async def websocket_teach_to_learn(websocket: WebSocket):
    await teach_to_learn_websocket(websocket)

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

@app.on_event("shutdown")
async def shutdown_event():
    # Perform cleanup
    logger.info("Shutting down application...")

# Root endpoint for health check
@app.get("/")
async def root():
    return {"status": "ok", "message": "ClarifAI backend is running"}

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