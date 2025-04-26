"""
Simple test for process_audio_websocket function.
"""
import os
import sys
import json
import asyncio
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.websockets import WebSocket
from fastapi import WebSocketDisconnect

# Change backend path to new src folder
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.abspath(os.path.join(script_dir, '..', '..', 'backend', 'src'))
sys.path.append(backend_path)

# Set a mock API key for testing to prevent actual API calls
os.environ["GEMINI_API_KEY"] = "fake-test-key"

@ pytest.mark.asyncio
async def test_process_audio_websocket_endpoint():
    """Test the /ws/process-audio WebSocket handler with a mock service and client."""  
    # Import the handler
    from backend.src.main import process_audio_websocket
    
    # Create a mock WebSocket client
    mock_websocket = AsyncMock(spec=WebSocket)
    mock_websocket.accept = AsyncMock()
    # First return a transcript payload, then raise disconnect to break the loop
    mock_websocket.receive_text = AsyncMock(side_effect=[
        json.dumps({"transcript": "This is a test transcript"}),
        WebSocketDisconnect()
    ])
    mock_websocket.send_json = AsyncMock()
    mock_websocket.close = AsyncMock()
    # Mock client_state to show CONNECTED
    mock_client_state = MagicMock()
    mock_client_state.CONNECTED = True
    mock_websocket.client_state = mock_client_state
    
    # Create and configure a mock GeminiService
    mock_service = MagicMock()
    async def mock_process_audio(transcript, previous):
        return {
            "concepts": [{
                "concept_name": "Test Concept",
                "text_snippet": "This is a test concept",
                "start_position": 0,
                "end_position": 20,
                "difficulty_level": 3,
                "is_current": True
            }],
            "current_concept": {"concept_name": "Test Concept"},
            "new_content": True,
            "flagged_history": [],
            "status": "success"
        }
    mock_service.process_audio_transcript = AsyncMock(side_effect=mock_process_audio)
    
    # Patch the global gemini_service in the handler module
    with patch('main.gemini_service', mock_service):
        await process_audio_websocket(mock_websocket)

        # verify calls
        mock_websocket.accept.assert_called_once()
        assert mock_websocket.receive_text.call_count == 2, \
            f"Expected receive_text twice but got {mock_websocket.receive_text.call_count}"
        mock_service.process_audio_transcript.assert_called_once_with(
            "This is a test transcript", ""
        )
        mock_websocket.send_json.assert_called_once()

        # inspect response
        result = mock_websocket.send_json.call_args[0][0]
        assert result["status"] == "success"
        assert "concepts" in result
        assert result["concepts"][0]["concept_name"] == "Test Concept"

# Run the test
if __name__ == "__main__":
    try:
        asyncio.run(test_process_audio_websocket_endpoint())
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc() 