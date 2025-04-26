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

class OrganizedNotes(Document):
    """Store organized lecture notes"""
    user_id: Optional[str] = None
    lecture_id: Optional[str] = None
    title: str = "Untitled Lecture"
    content: str = ""  # The processed and organized content of the lecture
    raw_transcript: str = ""  # Original transcript text
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "organized_notes"

class OtherConcept(Document):
    """Store concepts detected during transcription but not flagged"""
    transcript_id: Optional[str] = None
    lecture_id: Optional[str] = None
    concept_name: str
    text_snippet: str
    start_position: int = 0
    end_position: int = 0
    difficulty_level: int = 1
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "other_concepts"

class FlaggedConcept(Document):
    """Store flagged concepts with explanations"""
    concept_name: str
    explanation: str
    context: str = ""
    difficulty_level: int = 1
    transcript_id: Optional[str] = None
    lecture_id: Optional[str] = None
    user_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "flagged_concepts" 