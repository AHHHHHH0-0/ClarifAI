import os
import logging
import base64
import httpx
from typing import Optional

# Set up logging
logger = logging.getLogger(__name__)

class CroqTTSService:
    """
    Text-to-Speech service using Croq API
    """
    def __init__(self):
        self.api_key = os.getenv("CROQ_API_KEY")
        if not self.api_key:
            logger.warning("CROQ_API_KEY not found in environment variables")
        
        self.api_url = os.getenv("CROQ_API_URL", "https://api.croq.ai/v1/tts")
        self.voice = os.getenv("CROQ_VOICE", "en-US-Standard-I")  # Default voice
        
    async def text_to_speech(self, text: str, voice: Optional[str] = None) -> bytes:
        """
        Convert text to speech using Croq API
        
        Args:
            text: The text to convert to speech
            voice: Optional voice to use (defaults to configured voice)
            
        Returns:
            Audio data as bytes
        """
        if not self.api_key:
            raise ValueError("Croq API key not configured")
            
        try:
            # Prepare request payload
            payload = {
                "text": text,
                "voice": voice or self.voice,
                "audio_config": {
                    "audio_encoding": "MP3",
                    "speaking_rate": 1.0,
                    "pitch": 0.0,
                }
            }
            
            # Set headers with API key
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            # Make API request
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.api_url,
                    json=payload,
                    headers=headers,
                    timeout=10.0
                )
                
                # Check for error response
                response.raise_for_status()
                
                # Extract audio data from response
                response_data = response.json()
                audio_content = response_data.get("audio_content")
                
                if not audio_content:
                    raise ValueError("No audio content in response")
                    
                # Decode base64 audio content
                audio_bytes = base64.b64decode(audio_content)
                return audio_bytes
                
        except httpx.HTTPStatusError as e:
            logger.error(f"Croq API error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error in text-to-speech: {str(e)}")
            raise

# Factory function to create TTS service
def create_tts_service():
    """Create and return a text-to-speech service instance"""
    return CroqTTSService() 