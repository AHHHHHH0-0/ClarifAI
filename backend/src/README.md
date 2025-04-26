# Python Backend for ClarifAI

This is the Python backend service that handles audio transcript processing using Google's Gemini API.

## Setup

1. Create a virtual environment (recommended):

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r ../requirements.txt
```

3. Set up environment variables:
   Create a `.env` file in the root directory with:

```
GEMINI_API_KEY=your_api_key_here
```

## Running the Server

Start the FastAPI server:

```bash
python main.py
```

The server will start on `http://localhost:8000`

## WebSocket Endpoints

### Process Audio Transcript

- Endpoint: `ws://localhost:8000/ws/process-audio`
- Sends processed transcript information including main concepts, technical terms, and summary

### Generate Quiz

- Endpoint: `ws://localhost:8000/ws/generate-quiz`
- Generates quiz questions based on the transcript content

## Integration with Frontend

The frontend can connect to these WebSocket endpoints to:

1. Send audio transcripts for processing
2. Receive real-time analysis and quiz questions
3. Display the processed information to users
