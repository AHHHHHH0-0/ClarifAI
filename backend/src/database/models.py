from beanie import Document
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime

# User model for authentication
class User(Document):
    """Store user profile and authentication data"""
    email: EmailStr
    hashed_password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    disabled: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    
    class Settings:
        name = "users"
        indexes = [
            "email",  # Index for faster queries by email
        ]

# New Lecture model: each recording session stored here
class Lecture(Document):
    user_id: str
    title: str
    organized_notes: str
    
    class Settings:
        name = "lectures"

# Concept model: auto-extracted concepts per lecture
class Concept(Document):
    user_id: str
    lecture_id: str
    concept_name: str
    text_snippet: str
    difficulty_level: int
    start_position: int
    end_position: int
    
    class Settings:
        name = "concepts"

class FlaggedConcept(Document):
    """Store user-flagged concepts with explanations"""
    user_id: str
    lecture_id: str
    concept_name: str
    explanation: str
    text_snippet: str
    difficulty_level: int
    start_position: int
    end_position: int
    
    class Settings:
        name = "flagged_concepts" 