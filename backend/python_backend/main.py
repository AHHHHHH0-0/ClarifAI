from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
import json
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()  # Load environment variables at application startup

from gemini_service import GeminiService

app = FastAPI(
    title="ClarifAI API",
    description="API for processing audio transcripts and generating quizzes",
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

# Initialize Gemini service
gemini_service = GeminiService()

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
        await websocket.send_json({
            "status": "error",
            "message": str(e)
        })
    finally:
        if websocket.client_state.CONNECTED:
            await websocket.close()

@app.websocket("/ws/generate-quiz")
async def generate_quiz_websocket(websocket: WebSocket) -> None:
    await websocket.accept()
    
    try:
        while True:
            # Receive transcript from the client
            data = await websocket.receive_text()
            transcript_data = json.loads(data)
            transcript: str = transcript_data.get("transcript", "")
            
            # Generate quiz questions
            result: Dict[str, Any] = await gemini_service.generate_quiz(transcript)
            
            # Send the quiz back
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 