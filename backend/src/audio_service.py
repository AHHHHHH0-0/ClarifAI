import os
import asyncio
import logging
import base64
import json
from typing import Dict, Any, Optional, List, Callable
from pydantic import BaseModel
from dotenv import load_dotenv
import websockets
from uuid import uuid4
from datetime import datetime

# Conditionally import MongoDB dependencies
try:
    from bson.objectid import ObjectId
    from .database import get_database
    MONGODB_AVAILABLE = True
except ImportError:
    MONGODB_AVAILABLE = False
    logging.warning("MongoDB dependencies not available. Database operations will be skipped.")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class DeepgramConfig(BaseModel):
    api_key: Optional[str] = None
    language: str = "en"
    model: str = "nova-2"
    tier: str = "enhanced"
    smart_format: bool = True
    diarize: bool = False
    interim_results: bool = True
    endpointing: Optional[int] = 200
    demo_mode: bool = False  # Add demo mode option
    skip_db: bool = False  # Add option to skip database operations

class TranscriptionService:
    def __init__(self, config: Optional[DeepgramConfig] = None):
        """
        Initialize the Deepgram-based transcription service.
        
        Args:
            config: Configuration for Deepgram API
        """
        self.config = config or DeepgramConfig()
        self.api_key = self.config.api_key or os.getenv("DEEPGRAM_API_KEY")
        self.demo_mode = self.config.demo_mode
        self.skip_db = self.config.skip_db or not MONGODB_AVAILABLE
        
        # Only validate API key if not in demo mode
        if not self.api_key and not self.demo_mode:
            logger.warning("Deepgram API key not found. Starting in demo mode.")
            self.demo_mode = True
            
        self.transcription_buffer = ""
        self.ws_connections: Dict[str, Any] = {}
        self.callbacks: Dict[str, List[Callable]] = {}
    
    async def _store_session(self, session_id: str, user_id: str = None, lecture_id: str = None):
        """
        Store session information in MongoDB.
        
        Args:
            session_id: Unique session identifier
            user_id: User ID (if authenticated)
            lecture_id: Optional lecture ID if associated with a specific lecture
        """
        if self.skip_db:
            logger.info(f"Skipping database storage for session {session_id}")
            return
            
        try:
            # Convert string IDs to ObjectId if provided
            user_id_obj = ObjectId(user_id) if user_id else None
            lecture_id_obj = ObjectId(lecture_id) if lecture_id else None
            
            # Get database connection
            db = await get_database()
            
            # Create session document
            session_doc = {
                "sessionId": session_id,
                "userId": user_id_obj,
                "lectureId": lecture_id_obj,
                "status": "active",
                "lastActivityTimestamp": datetime.utcnow()
            }
            
            # Store in MongoDB
            await db.transcription_sessions.insert_one(session_doc)
            logger.info(f"Session {session_id} stored in database")
            
        except Exception as e:
            logger.error(f"Failed to store session in database: {str(e)}")
    
    async def _update_session_activity(self, session_id: str):
        """
        Update session's last activity timestamp and ensure status is active.
        
        Args:
            session_id: Session identifier
        """
        if self.skip_db:
            return
            
        try:
            db = await get_database()
            await db.transcription_sessions.update_one(
                {"sessionId": session_id},
                {
                    "$set": {
                        "lastActivityTimestamp": datetime.utcnow(),
                        "status": "active"
                    }
                }
            )
        except Exception as e:
            logger.error(f"Failed to update session activity: {str(e)}")
    
    async def _mark_session_inactive(self, session_id: str):
        """
        Mark session as inactive in the database.
        
        Args:
            session_id: Session identifier
        """
        if self.skip_db:
            return
            
        try:
            db = await get_database()
            await db.transcription_sessions.update_one(
                {"sessionId": session_id},
                {
                    "$set": {
                        "status": "inactive",
                        "lastActivityTimestamp": datetime.utcnow()
                    }
                }
            )
            logger.info(f"Session {session_id} marked as inactive")
        except Exception as e:
            logger.error(f"Failed to mark session as inactive: {str(e)}")
    
    async def _connect_to_deepgram(self, session_id: str):
        """
        Establish a WebSocket connection to Deepgram API.
        
        Args:
            session_id: Unique identifier for the session
        """
        try:
            # If in demo mode, simulate connection instead of connecting to Deepgram
            if self.demo_mode:
                logger.info(f"DEMO MODE: Simulating Deepgram connection for session {session_id}")
                # Start demo listener
                asyncio.create_task(self._simulate_transcripts(session_id))
                # Store fake connection info
                self.ws_connections[session_id] = {
                    "connection": None,
                    "is_active": True
                }
                return
                
            # Deepgram WebSocket URL with parameters
            url = "wss://api.deepgram.com/v1/listen?"
            params = {
                "language": self.config.language,
                "model": self.config.model,
                "tier": self.config.tier,
                "smart_format": "true" if self.config.smart_format else "false",
                "diarize": "true" if self.config.diarize else "false",
                "interim_results": "true" if self.config.interim_results else "false"
            }
            
            if self.config.endpointing:
                params["endpointing"] = str(self.config.endpointing)
                
            query_string = "&".join([f"{k}={v}" for k, v in params.items()])
            ws_url = f"{url}{query_string}"
            
            # Connect to Deepgram API
            extra_headers = {
                "Authorization": f"Token {self.api_key}"
            }
            
            conn = await websockets.connect(
                ws_url,
                extra_headers=extra_headers
            )
            
            # Store the connection
            self.ws_connections[session_id] = {
                "connection": conn,
                "is_active": True
            }
            
            # Start listener for this connection
            asyncio.create_task(self._listen_for_transcripts(session_id, conn))
            
        except Exception as e:
            logger.error(f"Error connecting to Deepgram: {str(e)}")
            raise
    
    async def _listen_for_transcripts(self, session_id: str, conn):
        """
        Listen for transcription results from Deepgram.
        
        Args:
            session_id: Session identifier
            conn: WebSocket connection
        """
        try:
            while self.ws_connections.get(session_id, {}).get("is_active", False):
                response = await conn.recv()
                data = json.loads(response)
                
                # Check if it's a speech transcript
                if "channel" in data:
                    transcript = self._process_deepgram_response(data, session_id)
                    
                    # Process callbacks
                    if session_id in self.callbacks:
                        for callback in self.callbacks[session_id]:
                            await callback(transcript)
                    
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Deepgram connection closed for session {session_id}")
        except Exception as e:
            logger.error(f"Error processing Deepgram response: {str(e)}")
        finally:
            # Clean up connection
            self.ws_connections[session_id]["is_active"] = False
            try:
                await conn.close()
            except:
                pass
    
    def _process_deepgram_response(self, data: Dict[str, Any], session_id: str) -> Dict[str, Any]:
        """
        Process and format the response from Deepgram.
        
        Args:
            data: Response data from Deepgram
            session_id: Session identifier
            
        Returns:
            Formatted transcript data
        """
        try:
            # Extract transcript from Deepgram's response
            if data.get("is_final"):
                transcript = data.get("channel", {}).get("alternatives", [{}])[0].get("transcript", "")
                confidence = data.get("channel", {}).get("alternatives", [{}])[0].get("confidence", 0)
                
                # Add to buffer for context
                if transcript:
                    self.transcription_buffer += " " + transcript
                    self.transcription_buffer = self.transcription_buffer.strip()
                
                return {
                    "status": "success",
                    "session_id": session_id,
                    "transcript": transcript,
                    "full_transcript": self.transcription_buffer,
                    "confidence": confidence,
                    "is_final": True,
                    "timestamp": asyncio.get_event_loop().time()
                }
            else:
                # Interim result
                transcript = data.get("channel", {}).get("alternatives", [{}])[0].get("transcript", "")
                return {
                    "status": "success",
                    "session_id": session_id,
                    "transcript": transcript,
                    "is_final": False,
                    "timestamp": asyncio.get_event_loop().time()
                }
                
        except Exception as e:
            logger.error(f"Error processing Deepgram response: {str(e)}")
            return {
                "status": "error",
                "message": f"Error processing transcript: {str(e)}",
                "session_id": session_id
            }
    
    async def _simulate_transcripts(self, session_id: str):
        """
        Simulate transcription results for demo mode.
        
        Args:
            session_id: Session identifier
        """
        try:
            # Continue while session is active
            while self.ws_connections.get(session_id, {}).get("is_active", False):
                # Wait a bit to simulate processing time
                await asyncio.sleep(2)
                
                # Create a demo transcript
                demo_transcript = {
                    "status": "success",
                    "session_id": session_id,
                    "transcript": "This is a demo transcript. No actual speech processing is happening.",
                    "full_transcript": "This is a demo transcript. No actual speech processing is happening.",
                    "confidence": 0.95,
                    "is_final": True,
                    "timestamp": asyncio.get_event_loop().time()
                }
                
                # Process callbacks
                if session_id in self.callbacks:
                    for callback in self.callbacks[session_id]:
                        await callback(demo_transcript)
                        
        except Exception as e:
            logger.error(f"Error in demo transcript simulation: {str(e)}")
        finally:
            # Mark connection as inactive when done
            if session_id in self.ws_connections:
                self.ws_connections[session_id]["is_active"] = False
    
    async def start_transcription_session(self, user_id: str = None, lecture_id: str = None, callback: Optional[Callable] = None) -> str:
        """
        Start a new transcription session.
        
        Args:
            user_id: Optional user identifier
            lecture_id: Optional lecture identifier
            callback: Function to call with transcription results
            
        Returns:
            Session ID
        """
        session_id = str(uuid4())
        
        # Register callback if provided
        if callback:
            if session_id not in self.callbacks:
                self.callbacks[session_id] = []
            self.callbacks[session_id].append(callback)
        
        # Connect to Deepgram
        await self._connect_to_deepgram(session_id)
        
        # Store session in MongoDB
        await self._store_session(session_id, user_id, lecture_id)
        
        return session_id
    
    async def transcribe_audio(self, audio_data: bytes, session_id: Optional[str] = None, user_id: str = None, lecture_id: str = None, is_base64: bool = True) -> Dict[str, Any]:
        """
        Send audio data to Deepgram for transcription.
        
        Args:
            audio_data: Raw audio data or base64-encoded audio
            session_id: Session identifier (creates a new one if not provided)
            user_id: Optional user identifier
            lecture_id: Optional lecture identifier
            is_base64: Whether the audio_data is base64 encoded
            
        Returns:
            Dict with session info
        """
        try:
            # Decode base64 if needed (skip actual decoding in demo mode)
            if is_base64 and not self.demo_mode:
                try:
                    audio_data = base64.b64decode(audio_data)
                except Exception as e:
                    logger.error(f"Error decoding base64 audio: {str(e)}")
                    return {"status": "error", "message": "Invalid base64 audio data"}
            
            # Create a new session if not provided
            if not session_id or session_id not in self.ws_connections:
                session_id = await self.start_transcription_session(user_id, lecture_id)
            else:
                # Update session activity timestamp
                await self._update_session_activity(session_id)
            
            # Get the connection
            conn_info = self.ws_connections.get(session_id)
            
            if not conn_info or not conn_info.get("is_active", False):
                return {"status": "error", "message": "No active connection", "session_id": session_id}
            
            # In demo mode, just acknowledge receipt without sending to Deepgram
            if self.demo_mode:
                return {
                    "status": "processing",
                    "session_id": session_id,
                    "message": "DEMO MODE: Audio received and processing"
                }
                
            # Send audio to Deepgram
            await conn_info["connection"].send(audio_data)
            
            # Return status
            return {
                "status": "processing",
                "session_id": session_id,
                "message": "Audio received and processing"
            }
                
        except Exception as e:
            logger.error(f"Error sending audio to Deepgram: {str(e)}")
            return {"status": "error", "message": str(e), "session_id": session_id if session_id else "unknown"}
    
    async def end_session(self, session_id: str) -> Dict[str, Any]:
        """
        End a transcription session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            Status information
        """
        if session_id in self.ws_connections:
            conn_info = self.ws_connections[session_id]
            conn_info["is_active"] = False
            
            # Close the connection
            try:
                await conn_info["connection"].close()
            except:
                pass
            
            # Remove connection
            self.ws_connections.pop(session_id, None)
            self.callbacks.pop(session_id, None)
            
            # Mark session as inactive in database
            await self._mark_session_inactive(session_id)
            
            return {
                "status": "success",
                "message": f"Session {session_id} closed",
                "full_transcript": self.transcription_buffer
            }
        
        return {
            "status": "error",
            "message": f"Session {session_id} not found"
        }
    
    def clear_buffer(self) -> None:
        """Clear the transcription buffer."""
        self.transcription_buffer = ""

# Factory function to create the service
def create_transcription_service(config: Optional[Dict[str, Any]] = None) -> TranscriptionService:
    """
    Create a transcription service with the given configuration.
    
    Args:
        config: Configuration for Deepgram
        
    Returns:
        Configured TranscriptionService
    """
    config_dict = config or {}
    # Default to demo mode for easy testing
    if "demo_mode" not in config_dict:
        config_dict["demo_mode"] = True  # Set demo mode to true by default
    
    # Skip database operations by default for testing
    if "skip_db" not in config_dict:
        config_dict["skip_db"] = True
        
    deepgram_config = DeepgramConfig(**config_dict)
    return TranscriptionService(deepgram_config) 
