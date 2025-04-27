from fastapi import WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState
from typing import Dict, Any
import json
import logging
import os
from deepgram import Deepgram
import asyncio

# Initialize logger
logger = logging.getLogger(__name__)

# Store active WebSocket connections
active_connections = {}

# Import services
from backend.src.services.gemini import GeminiService
from backend.src.services.audio import create_transcription_service

# Import database functions
from backend.src.database.db import (
    save_transcript, 
    save_flagged_concept, 
    save_organized_notes,
    save_other_concept,
    get_flagged_concepts
)

# Initialize services
gemini_service = GeminiService()
transcription_service = create_transcription_service()

async def process_audio_websocket(websocket: WebSocket) -> None:
    await websocket.accept()
    
    previous_transcript = ""
    user_id = None
    lecture_id = None
    transcript_id = None
    
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
                # Save the raw transcript
                transcript_id = await save_transcript(user_id, lecture_id, transcript)
                
                # Save any detected concepts that aren't flagged
                if "concepts" in result:
                    for concept in result["concepts"]:
                        # Skip the current concept as it might be flagged
                        if concept.get("is_current", False):
                            continue
                            
                        await save_other_concept(
                            concept_name=concept.get("concept_name", "Unknown Concept"),
                            text_snippet=concept.get("text_snippet", ""),
                            difficulty_level=concept.get("difficulty_level", 1),
                            start_position=concept.get("start_position", 0),
                            end_position=concept.get("end_position", 0),
                            transcript_id=transcript_id,
                            lecture_id=lecture_id
                        )
                
                # Generate and save organized notes
                # Call Gemini to create organized notes
                organized_content = await gemini_service.generate_organized_notes(transcript)
                
                # Save the organized notes
                await save_organized_notes(
                    user_id=user_id,
                    lecture_id=lecture_id,
                    title=organized_content.get("title", "Untitled Lecture"),
                    content=organized_content.get("content", ""),
                    raw_transcript=transcript
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
    """
    WebSocket endpoint to receive raw audio data and convert it to text using Deepgram.
    """
    await websocket.accept()
    session_id = None
    user_id = None
    lecture_id = None
    transcript_id = None
    DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")
    dg_client = Deepgram(DEEPGRAM_API_KEY)
    transcript_buffer = ""
    dg_socket = None

    try:
        # Connect to Deepgram's real-time streaming API
        dg_socket = await dg_client.transcription.live({
            'punctuate': True,
            'language': 'en-US',
        })

        async def on_transcript(data, **kwargs):
            nonlocal transcript_buffer
            if 'channel' in data and 'alternatives' in data['channel']:
                transcript = data['channel']['alternatives'][0]['transcript']
                if transcript:
                    transcript_buffer += transcript + " "
                    await websocket.send_json({"transcript": transcript_buffer.strip()})

        dg_socket.on('transcriptReceived', on_transcript)

        await websocket.send_json({
            "status": "connected",
            "message": "Connected to audio-to-text streaming API"
        })

        while True:
            message = await websocket.receive()
            if "bytes" in message:
                await dg_socket.send(message["bytes"])
            elif "text" in message:
                pass
    except WebSocketDisconnect:
        if dg_socket:
            await dg_socket.finish()
        logger.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        if dg_socket:
            await dg_socket.finish()
        logger.error(f"Error in audio-to-text: {str(e)}")
        if websocket.client_state == WebSocketState.CONNECTED:
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
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.close()

async def flag_concept_websocket(websocket: WebSocket) -> None:
    await websocket.accept()
    
    try:
        while True:
            # Receive concept flagging request
            data = await websocket.receive_text()
            flag_data = json.loads(data)
            
            concept_name = flag_data.get("concept_name", "")
            context = flag_data.get("context", "")
            user_id = flag_data.get("user_id")
            lecture_id = flag_data.get("lecture_id")
            transcript_id = flag_data.get("transcript_id")
            difficulty_level = flag_data.get("difficulty_level", 3)
            
            # Get explanation for the flagged concept
            result = await gemini_service.explain_concept(concept_name, context)
            
            # Save to database
            if result and "explanation" in result:
                await save_flagged_concept(
                    concept_name=concept_name,
                    explanation=result.get("explanation", ""),
                    context=context,
                    difficulty_level=difficulty_level,
                    transcript_id=transcript_id,
                    lecture_id=lecture_id,
                    user_id=user_id
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
    await websocket.accept()
    
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
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.close() 