"""
Test the integration between the GeminiService and FastAPI WebSocket endpoints.
"""
import os
import pytest
import json
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocket
from httpx import AsyncClient
import asyncio
from dotenv import load_dotenv
from fastapi import WebSocketDisconnect

# Load environment variables from .env files
load_dotenv(os.path.join("backend", "src", ".env"))

# Add the backend path to allow imports
import sys
sys.path.append(os.path.abspath("backend/src"))

# Set a mock API key for testing to prevent actual API calls
os.environ["GEMINI_API_KEY"] = "fake-test-key"

# Import the modules after setting up environment
from backend.src.main import app, process_audio_websocket, flag_concept_websocket, flagged_history_websocket, evaluate_understanding_websocket
from backend.src.gemini_service import GeminiService

# Mock the actual API calls to Gemini
@pytest.fixture
def mock_gemini_api():
    with patch('google.generativeai.GenerativeModel', autospec=True) as mock_model_class:
        # Mock response with a text property
        mock_response = MagicMock()
        mock_response.text = json.dumps([{
            "concept_name": "Test Concept",
            "text_snippet": "This is a test concept",
            "start_position": 0,
            "end_position": 20,
            "difficulty_level": 3,
            "is_current": True
        }])
        
        # Set up the mock model instance
        mock_model_instance = mock_model_class.return_value
        mock_model_instance.generate_content.return_value = mock_response
        
        yield mock_model_class

@pytest.fixture
def mock_gemini_service():
    with patch('backend.src.main.gemini_service') as service_instance:
        # Mock process_audio_transcript
        async def mock_process_audio(*args, **kwargs):
            return {
                "concepts": [{
                    "concept_name": "Test Concept",
                    "text_snippet": "This is a test concept",
                    "start_position": 0,
                    "end_position": 20,
                    "difficulty_level": 3,
                    "is_current": True
                }],
                "current_concept": {
                    "concept_name": "Test Concept",
                    "text_snippet": "This is a test concept",
                    "start_position": 0,
                    "end_position": 20,
                    "difficulty_level": 3,
                    "is_current": True
                },
                "new_content": True,
                "flagged_history": [],
                "status": "success"
            }
        
        # Mock explain_concept
        async def mock_explain(*args, **kwargs):
            return {
                "explanation": {
                    "explanation": "This is an explanation of the test concept.",
                    "examples": ["Example 1", "Example 2", "Example 3"],
                    "misconceptions": ["Misconception 1"],
                    "related_concepts": ["Related Concept 1"]
                },
                "timestamp": "2023-04-26T12:00:00",
                "status": "success"
            }
        
        # Mock evaluate_understanding
        async def mock_evaluate(*args, **kwargs):
            return {
                "evaluation": {
                    "understanding_level": 4,
                    "accurate_points": ["Point 1", "Point 2"],
                    "gaps": ["Gap 1"],
                    "follow_up_questions": ["Question 1?"],
                    "improvement_suggestions": ["Suggestion 1"]
                },
                "status": "success"
            }
        
        # Mock get_flagged_history
        async def mock_history(*args, **kwargs):
            return {
                "flagged_concepts": [],
                "status": "success"
            }
        
        service_instance.process_audio_transcript = AsyncMock(side_effect=mock_process_audio)
        service_instance.explain_concept = AsyncMock(side_effect=mock_explain)
        service_instance.evaluate_understanding = AsyncMock(side_effect=mock_evaluate)
        service_instance.get_flagged_history = AsyncMock(side_effect=mock_history)
        
        yield service_instance

# FastAPI TestClient setup
@pytest.fixture
def test_client():
    return TestClient(app)

# Websocket testing requires a bit more work with pytest
@pytest.mark.asyncio
async def test_process_audio_websocket(mock_gemini_service):
    """Test the process-audio websocket endpoint."""
    # Create a mock WebSocket
    mock_websocket = AsyncMock(spec=WebSocket)
    mock_websocket.accept = AsyncMock()
    mock_websocket.receive_text = AsyncMock(side_effect=[
        json.dumps({"transcript": "This is a test transcript"}),
        WebSocketDisconnect()
    ])
    mock_websocket.send_json = AsyncMock()
    mock_websocket.close = AsyncMock()
    # Mock the client_state properly
    mock_client_state = MagicMock()
    mock_client_state.CONNECTED = True
    mock_websocket.client_state = mock_client_state
    
    # Call the handler with our mock
    await process_audio_websocket(mock_websocket)
    
    # Verify the right methods were called
    mock_websocket.accept.assert_called_once()
    assert mock_websocket.receive_text.call_count == 2, \
        f"Expected receive_text called twice, got {mock_websocket.receive_text.call_count}"
    mock_gemini_service.process_audio_transcript.assert_called_once_with(
        "This is a test transcript", ""
    )
    mock_websocket.send_json.assert_called_once()
    
    # Check that the response was sent correctly
    called_args = mock_websocket.send_json.call_args[0][0]
    assert called_args["status"] == "success"
    assert "concepts" in called_args
    assert "current_concept" in called_args

@pytest.mark.asyncio
async def test_flag_concept_websocket(mock_gemini_service):
    """Test the flag-concept websocket endpoint."""
    # Create a mock WebSocket
    mock_websocket = AsyncMock(spec=WebSocket)
    mock_websocket.accept = AsyncMock()
    mock_websocket.receive_text = AsyncMock(side_effect=[
        json.dumps({"concept_name": "Test Concept", "context": "This is the context for the test concept"}),
        WebSocketDisconnect()
    ])
    mock_websocket.send_json = AsyncMock()
    mock_websocket.close = AsyncMock()
    # Mock the client_state properly
    mock_client_state = MagicMock()
    mock_client_state.CONNECTED = True
    mock_websocket.client_state = mock_client_state
    
    # Call the handler with our mock
    await flag_concept_websocket(mock_websocket)
    
    # Verify the right methods were called
    mock_websocket.accept.assert_called_once()
    assert mock_websocket.receive_text.call_count == 2, \
        f"Expected receive_text called twice, got {mock_websocket.receive_text.call_count}"
    mock_gemini_service.explain_concept.assert_called_once_with(
        "Test Concept", "This is the context for the test concept"
    )
    mock_websocket.send_json.assert_called_once()
    
    # Check that the response was sent correctly
    called_args = mock_websocket.send_json.call_args[0][0]
    assert called_args["status"] == "success"
    assert "explanation" in called_args

@pytest.mark.asyncio
async def test_flagged_history_websocket(mock_gemini_service):
    """Test the flagged-history websocket endpoint."""
    # Create a mock WebSocket
    mock_websocket = AsyncMock(spec=WebSocket)
    mock_websocket.accept = AsyncMock()
    mock_websocket.send_json = AsyncMock()
    mock_websocket.close = AsyncMock()
    # Mock the client_state properly
    mock_client_state = MagicMock()
    mock_client_state.CONNECTED = True
    mock_websocket.client_state = mock_client_state
    
    # Call the handler with our mock
    await flagged_history_websocket(mock_websocket)
    
    # Verify the right methods were called
    mock_websocket.accept.assert_called_once()
    mock_gemini_service.get_flagged_history.assert_called_once()
    mock_websocket.send_json.assert_called_once()
    
    # Check that the response was sent correctly
    called_args = mock_websocket.send_json.call_args[0][0]
    assert called_args["status"] == "success"
    assert "flagged_concepts" in called_args

@pytest.mark.asyncio
async def test_evaluate_understanding_websocket(mock_gemini_service):
    """Test the evaluate-understanding websocket endpoint."""
    # Create a mock WebSocket
    mock_websocket = AsyncMock(spec=WebSocket)
    mock_websocket.accept = AsyncMock()
    mock_websocket.receive_text = AsyncMock(side_effect=[
        json.dumps({"lecture_transcript": "This is the lecture transcript", "user_explanation": "This is the user's explanation"}),
        WebSocketDisconnect()
    ])
    mock_websocket.send_json = AsyncMock()
    mock_websocket.close = AsyncMock()
    # Mock the client_state properly
    mock_client_state = MagicMock()
    mock_client_state.CONNECTED = True
    mock_websocket.client_state = mock_client_state
    
    # Call the handler with our mock
    await evaluate_understanding_websocket(mock_websocket)
    
    # Verify the right methods were called
    mock_websocket.accept.assert_called_once()
    assert mock_websocket.receive_text.call_count == 2, \
        f"Expected receive_text called twice, got {mock_websocket.receive_text.call_count}"
    mock_gemini_service.evaluate_understanding.assert_called_once_with(
        "This is the lecture transcript", "This is the user's explanation"
    )
    mock_websocket.send_json.assert_called_once()
    
    # Check that the response was sent correctly
    called_args = mock_websocket.send_json.call_args[0][0]
    assert called_args["status"] == "success"
    assert "evaluation" in called_args

@pytest.mark.asyncio
async def test_websocket_exception_handling(mock_gemini_service):
    """Test exception handling in websocket endpoints."""
    # Create a mock WebSocket
    mock_websocket = AsyncMock(spec=WebSocket)
    mock_websocket.accept = AsyncMock()
    mock_websocket.receive_text = AsyncMock(side_effect=Exception("Test error"))
    mock_websocket.send_json = AsyncMock()
    mock_websocket.close = AsyncMock()
    # Mock the client_state properly
    mock_client_state = MagicMock()
    mock_client_state.CONNECTED = True
    mock_websocket.client_state = mock_client_state
    
    # Call the handler with our mock
    await process_audio_websocket(mock_websocket)
    
    # Verify error handling
    mock_websocket.send_json.assert_called_once()
    called_args = mock_websocket.send_json.call_args[0][0]
    assert called_args["status"] == "error"
    assert "message" in called_args
    
# Now let's test the GeminiService directly with mocking

class TestGeminiService:
    @pytest.mark.asyncio
    async def test_gemini_service_initialization(self, mock_gemini_api):
        """Test that the GeminiService initializes correctly."""
        service = GeminiService()
        assert hasattr(service, "model")
        assert hasattr(service, "flagged_concepts")
        assert len(service.flagged_concepts) == 0

    @pytest.mark.asyncio
    async def test_process_audio_transcript(self, mock_gemini_api):
        """Test processing an audio transcript."""
        service = GeminiService()
        
        # Mock the API call method
        with patch.object(service, '_safe_api_call') as mock_api_call:
            mock_api_call.return_value = [{
                "concept_name": "Test Concept",
                "text_snippet": "This is a test concept",
                "start_position": 0,
                "end_position": 20,
                "difficulty_level": 3,
                "is_current": True
            }]
            
            result = await service.process_audio_transcript("This is a test transcript")
            
            assert "concepts" in result
            assert "current_concept" in result
            assert "new_content" in result
            assert "flagged_history" in result
            assert "status" in result
            assert result["status"] == "success"
            
            # Test with the same transcript (no new content)
            service.last_concepts = result["concepts"]
            service.last_current_concept = result["current_concept"]
            
            second_result = await service.process_audio_transcript(
                "This is a test transcript", 
                "This is a test transcript"
            )
            assert second_result["new_content"] is False

    @pytest.mark.asyncio
    async def test_explain_concept(self, mock_gemini_api):
        """Test explaining a concept."""
        # Mock the _safe_api_call method to return test data
        service = GeminiService()
        
        with patch.object(service, '_safe_api_call') as mock_api_call:
            mock_api_call.return_value = {
                "explanation": "This is an explanation",
                "examples": ["Example 1", "Example 2", "Example 3"],
                "misconceptions": ["Misconception 1"],
                "related_concepts": ["Related Concept 1"]
            }
            
            result = await service.explain_concept("Test Concept", "Test Context")
            
            assert "explanation" in result
            assert "timestamp" in result
            assert "status" in result
            assert result["status"] == "success"
            
            # Check that the concept was added to flagged_concepts
            assert len(service.flagged_concepts) == 1
            assert service.flagged_concepts[0]["concept"] == "Test Concept"

    @pytest.mark.asyncio
    async def test_evaluate_understanding(self, mock_gemini_api):
        """Test evaluating understanding."""
        # Mock the _safe_api_call method to return test data
        service = GeminiService()
        
        with patch.object(service, '_safe_api_call') as mock_api_call:
            mock_api_call.return_value = {
                "understanding_level": 4,
                "accurate_points": ["Point 1", "Point 2"],
                "gaps": ["Gap 1"],
                "follow_up_questions": ["Question 1?"],
                "improvement_suggestions": ["Suggestion 1"]
            }
            
            result = await service.evaluate_understanding(
                "This is the lecture", 
                "This is the explanation"
            )
            
            assert "evaluation" in result
            assert "status" in result
            assert result["status"] == "success"
            assert result["evaluation"]["understanding_level"] == 4

    @pytest.mark.asyncio
    async def test_get_flagged_history(self, mock_gemini_api):
        """Test retrieving flagged history."""
        service = GeminiService()
        
        # Add some test data to flagged_concepts
        service.flagged_concepts = [{
            "concept": "Test Concept",
            "timestamp": "2023-04-26T12:00:00",
            "context": "Test Context",
            "explanation": {"explanation": "Test explanation"}
        }]
        
        result = await service.get_flagged_history()
        
        assert "flagged_concepts" in result
        assert "status" in result
        assert result["status"] == "success"
        assert len(result["flagged_concepts"]) == 1
        assert result["flagged_concepts"][0]["concept"] == "Test Concept" 