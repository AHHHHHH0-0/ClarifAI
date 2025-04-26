from fastapi import WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState
from typing import Dict, Any
import json
import logging
import base64

# Initialize logger
logger = logging.getLogger(__name__)

# Store active WebSocket connections
active_connections = {}

# Import services
from backend.src.services.gemini import GeminiService
from backend.src.services.audio import create_transcription_service
from backend.src.services.tts import create_tts_service

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
tts_service = create_tts_service()

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
    
    try:
        # First, get initialization parameters
        init_data = await websocket.receive_text()
        params = json.loads(init_data)
        
        # Extract user_id and lecture_id if provided
        user_id = params.get("user_id")
        lecture_id = params.get("lecture_id")
        
        logger.info(f"Initializing audio transcription for user_id: {user_id}, lecture_id: {lecture_id}")
        
        # Define callback function to forward transcription to client
        async def transcription_callback(result: Dict[str, Any]):
            if websocket.client_state == WebSocketState.CONNECTED:
                try:
                    # If this is a final result with a transcript, also process with Gemini
                    if result.get("is_final", False) and result.get("full_transcript"):
                        full_transcript = result.get("full_transcript")
                        
                        # Save the transcript to the database
                        transcript_id = await save_transcript(user_id, lecture_id, full_transcript)
                        
                        # Process with Gemini service
                        gemini_result = await gemini_service.process_audio_transcript(
                            full_transcript,
                            ""  # No previous transcript needed as service manages the buffer
                        )
                        
                        # Add the processed concepts to the result
                        result["concepts"] = gemini_result.get("concepts", [])
                        result["current_concept"] = gemini_result.get("current_concept")
                        
                        # Save detected concepts that aren't flagged
                        for concept in gemini_result.get("concepts", []):
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
                        organized_content = await gemini_service.generate_organized_notes(full_transcript)
                        
                        # Save the organized notes
                        await save_organized_notes(
                            user_id=user_id,
                            lecture_id=lecture_id,
                            title=organized_content.get("title", "Untitled Lecture"),
                            content=organized_content.get("content", ""),
                            raw_transcript=full_transcript
                        )
                    
                    # Send result to client
                    await websocket.send_json(result)
                except Exception as e:
                    logger.error(f"Error in transcription callback: {str(e)}")
        
        # Start a new transcription session with the callback
        session_id = await transcription_service.start_transcription_session(
            user_id=user_id,
            lecture_id=lecture_id,
            callback=transcription_callback
        )
        
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
            await transcription_service.transcribe_audio(
                base64_audio, 
                session_id,
                user_id, 
                lecture_id
            )
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
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

async def teach_to_learn_websocket(websocket: WebSocket) -> None:
    """
    WebSocket endpoint for the teach-to-learn mode that combines:
    - Speech-to-text for user input
    - AI evaluation and teaching responses
    - Text responses for client-side TTS (using Web Speech API)
    
    The frontend only shows a progress bar, and handles text-to-speech in the browser.
    """
    await websocket.accept()
    session_id = None
    conversation_history = []
    current_topic = None
    understanding_score = 0
    
    try:
        # First, get initialization parameters
        init_data = await websocket.receive_text()
        params = json.loads(init_data)
        
        # Extract user info and topic
        user_id = params.get("user_id")
        current_topic = params.get("topic", "")
        
        if not current_topic:
            await websocket.send_json({
                "status": "error",
                "message": "No topic specified for teach-to-learn mode"
            })
            return
            
        logger.info(f"Starting teach-to-learn session for user {user_id} on topic: {current_topic}")
        
        # Send initial question as text for client-side TTS
        initial_question = f"Let's discuss the topic of {current_topic}. What do you understand about it so far?"
        
        # Send initial question
        await websocket.send_json({
            "status": "question",
            "understanding_score": 0,  # Initial score
            "text": initial_question,  # Text for client-side TTS
            "use_client_tts": True     # Flag to use client-side TTS
        })
        
        # Add to conversation history
        conversation_history.append({"ai": initial_question})
        
        # Define callback function to process user speech
        async def transcription_callback(result: Dict[str, Any]):
            nonlocal understanding_score, conversation_history
            
            if websocket.client_state == WebSocketState.CONNECTED:
                try:
                    # If this is a final result with a transcript
                    if result.get("is_final", False) and result.get("transcript"):
                        user_response = result.get("transcript")
                        
                        # Add to conversation history
                        conversation_history.append({"user": user_response})
                        
                        # Process with Gemini service
                        teaching_result = await gemini_service.teach_to_learn(
                            current_topic,
                            user_response,
                            conversation_history
                        )
                        
                        # Update understanding score
                        understanding_score = teaching_result.get("understanding_score", understanding_score)
                        
                        # Prepare AI response
                        ai_response = teaching_result.get("response", "")
                        follow_up = teaching_result.get("follow_up_question", "")
                        full_response = f"{ai_response} {follow_up}"
                        
                        # Add to conversation history
                        conversation_history.append({"ai": full_response})
                        
                        # Check if learning is complete
                        is_complete = teaching_result.get("is_complete", False)
                        
                        # Send response as text for client-side TTS
                        await websocket.send_json({
                            "status": "response",
                            "understanding_score": understanding_score,
                            "is_complete": is_complete,
                            "text": full_response,
                            "use_client_tts": True
                        })
                            
                except Exception as e:
                    logger.error(f"Error in teach-to-learn callback: {str(e)}")
        
        # Start a new transcription session with the callback
        session_id = await transcription_service.start_transcription_session(
            user_id=user_id,
            callback=transcription_callback
        )
        
        # Store the WebSocket connection for reference
        active_connections[session_id] = websocket
        
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
                    "message": "No audio data provided"
                })
                continue
            
            # Check if user wants to stop
            if audio_data.get("stop", False):
                # Send completion message
                completion_message = f"Great work on learning about {current_topic}! You've reached an understanding score of {understanding_score}%."
                
                await websocket.send_json({
                    "status": "complete",
                    "understanding_score": understanding_score,
                    "text": completion_message,
                    "use_client_tts": True
                })
                break
            
            # Send to Deepgram (response comes through the callback)
            await transcription_service.transcribe_audio(
                base64_audio, 
                session_id,
                user_id
            )
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for teach-to-learn session {session_id}")
    except Exception as e:
        logger.error(f"Error in teach-to-learn: {str(e)}")
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.send_json({
                "status": "error",
                "message": str(e)
            })
    finally:
        # Clean up
        if session_id:
            await transcription_service.end_session(session_id)
            active_connections.pop(session_id, None)
        
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.close() 