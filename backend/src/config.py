from dotenv import load_dotenv
import os
import logging

# Load environment variables
from pathlib import Path
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

print("DEBUG: MONGODB_URL =", os.getenv("MONGODB_URL"))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# API settings
API_TITLE = "ClarifAI API"
API_DESCRIPTION = "API for processing audio transcripts and explaining concepts"
API_VERSION = "1.0.0"

# Service settings
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")

# Database settings
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "lahacks")

# Enable/disable demo mode
DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() in ("true", "1", "t") 