from beanie import Document
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# Basic models structure - this will be populated with models from any existing implementation
# or left as a template for future models

class Transcript(Document):
    """Store transcription data"""
    user_id: Optional[str] = None
    lecture_id: Optional[str] = None
    text: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "transcripts"

class FlaggedConcept(Document):
    """Store flagged concepts with explanations"""
    concept_name: str
    explanation: str
    context: str = ""
    difficulty_level: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "flagged_concepts" 