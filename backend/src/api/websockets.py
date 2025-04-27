from fastapi import WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState
from typing import Dict, Any
import json
import logging
import base64

# Initialize logger
logger = logging.getLogger(__name__)

# Import services
from backend.src.services.gemini import GeminiService
from backend.src.services.audio import create_transcription_service

# Import database functions
from backend.src.database.db import (
    save_transcript, 
    save_flagged_concept, 
    save_organized_notes,
    save_other_concept,
    get_flagged_concepts,
    get_organized_notes
)

# Initialize services
gemini_service = GeminiService()
transcription_service = create_transcription_service()

# Helper to centralize evaluation logic
async def evaluate_user_understanding(lecture_content: str, user_explanation: str) -> Dict[str, Any]:
    """
    Helper to evaluate user's understanding using GeminiService.
    """
    return await gemini_service.evaluate_understanding(lecture_content, user_explanation)

async def audio_to_text_websocket(websocket: WebSocket) -> None:
    """
    WebSocket endpoint to receive raw audio data and convert it to text using Deepgram.
    Can be used in three modes:
    1. Full audio streaming with concept detection (mode="lecture")
    2. Processing existing transcripts (mode="process")
    3. Audio for teach-to-learn mode (mode="teach") - handled separately
    """
    await websocket.accept()
    session_id = None
    user_id = None
    lecture_id = None
    transcript_id = None
    previous_transcript = ""
    mode = "lecture"  # Default mode
    
    try:
        # First, get initialization parameters
        init_data = await websocket.receive_text()
        params = json.loads(init_data)
        
        # Extract user_id and lecture_id if provided
        user_id = params.get("user_id")
        lecture_id = params.get("lecture_id")
        mode = params.get("mode", "lecture")  # Get mode from request
        
        logger.info(f"Initializing audio transcription for user_id: {user_id}, lecture_id: {lecture_id}, mode: {mode}")
        
        # If we're just processing existing transcripts (not streaming audio)
        if mode == "process":
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
        else:  # Normal audio streaming mode (lecture)
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
            data = await websocket.receive_text()
            eval_data = json.loads(data)
            notes_id = eval_data.get("notes_id")
            if not notes_id:
                await websocket.send_json({"status":"error","message":"notes_id is required"})
                continue
            notes = await get_organized_notes(notes_id)
            if not notes:
                await websocket.send_json({"status":"error","message":f"No notes found for id {notes_id}"})
                continue
            lecture_content = notes.content
            user_explanation = eval_data.get("user_explanation", "")
            # Delegate to helper
            result = await evaluate_user_understanding(lecture_content, user_explanation)
            await websocket.send_json({
                "status": "success",
                "evaluation": result.get("evaluation")
            })
    except WebSocketDisconnect:
        await websocket.close()
    except Exception as e:
        if websocket.client_state == WebSocketState.CONNECTED:
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
    
    Note: This handler focuses on the teaching logic, using audio_to_text_websocket
    with mode="teach" for the actual audio processing.
    """
    await websocket.accept()
    conversation_history = []
    current_topic = None
    understanding_score = 0
    user_id = None
    
    try:
        # First, get initialization parameters
        init_data = await websocket.receive_text()
        params = json.loads(init_data)
        # Extract user info, topic, and notes
        user_id = params.get("user_id")
        current_topic = params.get("topic", "")
        notes_id = params.get("notes_id")
        if not notes_id:
            await websocket.send_json({"status":"error","message":"notes_id is required"})
            return
        notes = await get_organized_notes(notes_id)
        if not notes:
            await websocket.send_json({"status":"error","message":f"No notes found for id {notes_id}"})
            return
        lecture_content = notes.content

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
        
        # Process user's spoken responses
        while True:
            # Receive data from client
            data = await websocket.receive_text()
            input_data = json.loads(data)
            
            # Check if user wants to stop
            if input_data.get("stop", False):
                # Send completion message
                completion_message = f"Great work on learning about {current_topic}! You've reached an understanding score of {understanding_score}%."
                
                await websocket.send_json({
                    "status": "complete",
                    "understanding_score": understanding_score,
                    "text": completion_message,
                    "use_client_tts": True
                })
                break
                
            if input_data.get("transcript"):
                user_response = input_data.get("transcript")
                is_final = input_data.get("is_final", True)
                # Only process final transcripts
                if is_final:
                    # Add to conversation history
                    conversation_history.append({"user": user_response})
                    # Delegate to the evaluation helper
                    result = await evaluate_user_understanding(lecture_content, user_response)
                    evaluation = result.get("evaluation", {})
                    level = evaluation.get("understanding_level", 3)
                    # Convert 1-5 scale to percentage
                    understanding_score = level * 20
                    follow_up_questions = evaluation.get("follow_up_questions", [])
                    improvement_suggestions = evaluation.get("improvement_suggestions", [])
                    # Choose next question
                    if follow_up_questions:
                        next_text = follow_up_questions[0]
                    elif improvement_suggestions:
                        next_text = improvement_suggestions[0]
                    else:
                        next_text = "Can you tell me more about this topic?"
                    is_complete = level == 5
                    # Add to conversation history
                    conversation_history.append({"ai": next_text})
                    # Send response for client-side TTS
                    await websocket.send_json({
                        "status": "response",
                        "understanding_score": understanding_score,
                        "is_complete": is_complete,
                        "text": next_text,
                        "use_client_tts": True
                    })
         
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for teach-to-learn session for user {user_id}")
    except Exception as e:
        logger.error(f"Error in teach-to-learn: {str(e)}")
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.send_json({
                "status": "error",
                "message": str(e)
            })
    finally:
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.close() 