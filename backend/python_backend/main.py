from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
import json

from gemini_service import GeminiService

app = FastAPI()

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
async def process_audio_websocket(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            # Receive transcript from the client
            data = await websocket.receive_text()
            transcript_data = json.loads(data)
            transcript = transcript_data.get("transcript", "")
            
            # Process the transcript
            result = await gemini_service.process_audio_transcript(transcript)
            
            # Send the processed result back
            await websocket.send_json(result)
            
    except Exception as e:
        await websocket.send_json({
            "status": "error",
            "message": str(e)
        })
    finally:
        await websocket.close()

@app.websocket("/ws/generate-quiz")
async def generate_quiz_websocket(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            # Receive transcript from the client
            data = await websocket.receive_text()
            transcript_data = json.loads(data)
            transcript = transcript_data.get("transcript", "")
            
            # Generate quiz questions
            result = await gemini_service.generate_quiz(transcript)
            
            # Send the quiz back
            await websocket.send_json(result)
            
    except Exception as e:
        await websocket.send_json({
            "status": "error",
            "message": str(e)
        })
    finally:
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 