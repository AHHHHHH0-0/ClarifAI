from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
import json
import logging
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()  # Load environment variables at application startup

from gemini_service import GeminiService
from audio_service import create_transcription_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ClarifAI API",
    description="API for processing audio transcripts and explaining concepts",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
gemini_service = GeminiService()
transcription_service = create_transcription_service()

# Store active WebSocket connections
active_connections = {}

@app.websocket("/ws/process-audio")
async def process_audio_websocket(websocket: WebSocket) -> None:
    await websocket.accept()
    
    previous_transcript = ""
    
    try:
        while True:
            # Receive transcript from the client
            data = await websocket.receive_text()
            transcript_data = json.loads(data)
            transcript: str = transcript_data.get("transcript", "")
            
            # Process the transcript with incremental support
            result: Dict[str, Any] = await gemini_service.process_audio_transcript(
                transcript, 
                previous_transcript
            )
            
            # Update previous transcript for next iteration
            previous_transcript = transcript
            
            # Send the processed result back
            await websocket.send_json(result)
            
    except WebSocketDisconnect:
        await websocket.close()
    except Exception as e:
        logger.error(f"Error in process-audio: {str(e)}")
        await websocket.send_json({
            "status": "error",
            "message": str(e)
        })
    finally:
        if websocket.client_state.CONNECTED:
            await websocket.close()

@app.websocket("/ws/audio-to-text")
async def audio_to_text_websocket(websocket: WebSocket) -> None:
    """
    WebSocket endpoint to receive raw audio data and convert it to text using Deepgram.
    """
    await websocket.accept()
    session_id = None
    
    # Define callback function to forward transcription to client
    async def transcription_callback(result: Dict[str, Any]):
        if websocket.client_state.CONNECTED:
            try:
                # If this is a final result with a transcript, also process with Gemini
                if result.get("is_final", False) and result.get("full_transcript"):
                    full_transcript = result.get("full_transcript")
                    
                    # Process with Gemini service
                    gemini_result = await gemini_service.process_audio_transcript(
                        full_transcript,
                        ""  # No previous transcript needed as service manages the buffer
                    )
                    
                    # Add the processed concepts to the result
                    result["concepts"] = gemini_result.get("concepts", [])
                    result["current_concept"] = gemini_result.get("current_concept")
                
                # Send result to client
                await websocket.send_json(result)
            except Exception as e:
                logger.error(f"Error in transcription callback: {str(e)}")
    
    try:
        # Start a new transcription session with the callback
        session_id = await transcription_service.start_transcription_session(transcription_callback)
        
        # Store the WebSocket connection for reference
        active_connections[session_id] = websocket
        
        # Send initial confirmation
        await websocket.send_json({
            "status": "connected",
            "session_id": session_id,
            "message": "Connected to Deepgram streaming API"
        })
        
        # Listen for audio chunks from the client
        while True:
            # Receive audio chunk from the client
            data = await websocket.receive_text()
            audio_data = json.loads(data)
            
            # Extract base64 audio
            base64_audio = audio_data.get("audio", "")
            if not base64_audio:
                await websocket.send_json({
                    "status": "error",
                    "message": "No audio data provided",
                    "session_id": session_id
                })
                continue
            
            # Send to Deepgram (response comes through the callback)
            await transcription_service.transcribe_audio(base64_audio, session_id)
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"Error in audio-to-text: {str(e)}")
        if websocket.client_state.CONNECTED:
            await websocket.send_json({
                "status": "error",
                "message": str(e),
                "session_id": session_id if session_id else "unknown"
            })
    finally:
        # Clean up
        if session_id:
            await transcription_service.end_session(session_id)
            active_connections.pop(session_id, None)
        
        if websocket.client_state.CONNECTED:
            await websocket.close()

@app.websocket("/ws/flag-concept")
async def flag_concept_websocket(websocket: WebSocket) -> None:
    await websocket.accept()
    
    try:
        while True:
            # Receive concept flagging request
            data = await websocket.receive_text()
            flag_data = json.loads(data)
            
            concept_name = flag_data.get("concept_name", "")
            context = flag_data.get("context", "")
            
            # Get explanation for the flagged concept
            result = await gemini_service.explain_concept(concept_name, context)
            
            # Send the explanation back
            await websocket.send_json(result)
            
    except WebSocketDisconnect:
        await websocket.close()
    except Exception as e:
        await websocket.send_json({
            "status": "error",
            "message": str(e)
        })
    finally:
        if websocket.client_state.CONNECTED:
            await websocket.close()

@app.websocket("/ws/flagged-history")
async def flagged_history_websocket(websocket: WebSocket) -> None:
    await websocket.accept()
    
    try:
        # Just retrieve the history - no need for continuous updates
        result = await gemini_service.get_flagged_history()
        await websocket.send_json(result)
            
    except WebSocketDisconnect:
        await websocket.close()
    except Exception as e:
        await websocket.send_json({
            "status": "error",
            "message": str(e)
        })
    finally:
        if websocket.client_state.CONNECTED:
            await websocket.close()

@app.websocket("/ws/evaluate-understanding")
async def evaluate_understanding_websocket(websocket: WebSocket) -> None:
    await websocket.accept()
    
    try:
        while True:
            # Receive evaluation request
            data = await websocket.receive_text()
            eval_data = json.loads(data)
            
            lecture_transcript = eval_data.get("lecture_transcript", "")
            user_explanation = eval_data.get("user_explanation", "")
            
            # Evaluate understanding
            result = await gemini_service.evaluate_understanding(lecture_transcript, user_explanation)
            
            # Send the evaluation back
            await websocket.send_json(result)
            
    except WebSocketDisconnect:
        await websocket.close()
    except Exception as e:
        await websocket.send_json({
            "status": "error",
            "message": str(e)
        })
    finally:
        if websocket.client_state.CONNECTED:
            await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 