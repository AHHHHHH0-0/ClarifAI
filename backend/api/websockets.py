from fastapi import WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState
from typing import Dict, Any
import json
import logging
import os
from deepgram import DeepgramClient, LiveTranscriptionEvents, LiveOptions
import asyncio
import websockets

# Initialize logger
logger = logging.getLogger(__name__)

# Store active WebSocket connections
active_connections = {}

# Import services
from services.gemini import GeminiService
from services.audio import create_transcription_service

# Import database functions
from database.db import (
    save_lecture,
    get_user_lectures,
    save_concept,
    save_flagged_concept,
    get_flagged_concepts
)

# Initialize services
gemini_service = GeminiService()
transcription_service = create_transcription_service()

# Helper function to handle WebSocket CORS
async def handle_websocket_cors(websocket: WebSocket) -> None:
    # Accept the connection with CORS headers
    await websocket.accept()
    
    # Log connection details
    client = websocket.client
    logger.info(f"WebSocket connection accepted from {client}")

async def process_audio_websocket(websocket: WebSocket) -> None:
    await handle_websocket_cors(websocket)
    
    previous_transcript = ""
    user_id = None
    lecture_id = None
    
    try:
        # Get initial data for identifying the user/lecture
        init_data = await websocket.receive_text()
        params = json.loads(init_data)
        user_id = params.get("user_id")
        lecture_id = params.get("lecture_id")
        
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
            
            # If this is a final transcript, save it to the database
            if transcript_data.get("is_final", False):
                # On final transcript, generate organized notes and save as a Lecture
                organized_content = await gemini_service.generate_organized_notes(transcript)
                lecture_id = await save_lecture(
                    user_id=user_id,
                    title=organized_content.get("title", "Untitled Lecture"),
                    organized_notes=organized_content.get("content", "")
                )
                
                # Save all extracted concepts to the database
                if "concepts" in result:
                    for concept in result["concepts"]:
                        # Skip current concept if desired
                        if concept.get("is_current", False):
                            continue
                        await save_concept(
                            user_id=user_id,
                            lecture_id=lecture_id,
                            concept_name=concept.get("concept_name", "Unknown Concept"),
                            text_snippet=concept.get("text_snippet", ""),
                            difficulty_level=concept.get("difficulty_level", 1),
                            start_position=concept.get("start_position", 0),
                            end_position=concept.get("end_position", 0)
                        )
            
    except WebSocketDisconnect:
        await websocket.close()
    except Exception as e:
        logger.error(f"Error in process-audio: {str(e)}")
        await websocket.send_json({
            "status": "error",
            "message": str(e)
        })
    finally:
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.close()

async def audio_to_text_websocket(websocket: WebSocket) -> None:
    await handle_websocket_cors(websocket)
    DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
    uri = "wss://api.deepgram.com/v1/listen"
    headers = {
        "Authorization": f"token {DEEPGRAM_API_KEY}"
    }
    try:
        async with websockets.connect(uri, extra_headers=headers) as dg_ws:
            print("Connected to Deepgram WebSocket.")

            async def receive_transcripts():
                try:
                    async for message in dg_ws:
                        try:
                            data = json.loads(message)
                            # Extract transcript text and send to frontend
                            if (
                                data.get("type") == "Results"
                                and data.get("channel")
                                and data["channel"]["alternatives"]
                            ):
                                transcript = data["channel"]["alternatives"][0].get("transcript", "")
                                if transcript:
                                    await websocket.send_json({"transcript": transcript})
                        except Exception as e:
                            print("Non-JSON message from Deepgram:", message)
                except Exception as e:
                    print("Deepgram WebSocket closed:", e)

            recv_task = asyncio.create_task(receive_transcripts())

            while True:
                message = await websocket.receive()
                if "bytes" in message:
                    await dg_ws.send(message["bytes"])
                elif "text" in message:
                    pass
    except Exception as e:
        print("Error in audio_to_text_websocket:", e)
        await websocket.close()
    finally:
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.close()

async def flag_concept_websocket(websocket: WebSocket) -> None:
    await handle_websocket_cors(websocket)
    
    try:
        while True:
            # Receive concept flagging request
            data = await websocket.receive_text()
            flag_data = json.loads(data)

            user_id = flag_data.get("user_id")
            lecture_id = flag_data.get("lecture_id")
            concept_name = flag_data.get("concept_name", "")
            text_snippet = flag_data.get("context", "")  # snippet from audio
            difficulty_level = flag_data.get("difficulty_level", 3)
            start_position = flag_data.get("start_position", 0)
            end_position = flag_data.get("end_position", 0)

            # Get explanation for the flagged concept
            result = await gemini_service.explain_concept(concept_name, text_snippet)

            # Save flagged concept to database
            if result and "explanation" in result:
                await save_flagged_concept(
                    user_id=user_id,
                    lecture_id=lecture_id,
                    concept_name=concept_name,
                    explanation=result.get("explanation", ""),
                    text_snippet=text_snippet,
                    difficulty_level=difficulty_level,
                    start_position=start_position,
                    end_position=end_position
                )

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
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.close()

async def flagged_history_websocket(websocket: WebSocket) -> None:
    await handle_websocket_cors(websocket)
    
    try:
        # Receive request data
        data = await websocket.receive_text()
        request_data = json.loads(data)
        
        # Extract user_id if provided
        user_id = request_data.get("user_id")
        
        # Retrieve flagged concepts from database
        flagged_concepts = await get_flagged_concepts(user_id)
        
        # Format for client
        result = {
            "status": "success",
            "flagged_concepts": [concept.dict() for concept in flagged_concepts]
        }
        
        # Send the results
        await websocket.send_json(result)
            
    except WebSocketDisconnect:
        await websocket.close()
    except Exception as e:
        await websocket.send_json({
            "status": "error",
            "message": str(e)
        })
    finally:
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.close()

async def evaluate_understanding_websocket(websocket: WebSocket) -> None:
    await handle_websocket_cors(websocket)
    
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
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.close()

async def lectures_websocket(websocket: WebSocket) -> None:
    """WebSocket endpoint to retrieve lectures for a user"""
    await handle_websocket_cors(websocket)
    try:
        # Allow connection without authentication for testing purposes
        data = await websocket.receive_text()
        params = json.loads(data)
        user_id = params.get("user_id")
        lectures = await get_user_lectures(user_id)
        # Send lectures list to client
        await websocket.send_json({
            "status": "success",
            "lectures": [lecture.dict() for lecture in lectures]
        })
    except WebSocketDisconnect:
        await websocket.close()
    except Exception as e:
        logger.error(f"Error in lectures_ws: {e}")
        await websocket.send_json({"status": "error", "message": str(e)})
    finally:
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.close()

# NOTE: Ensure your frontend is sending audio in a Deepgram-supported format (e.g., 16-bit PCM, mono, 16kHz or 8kHz, little-endian) 