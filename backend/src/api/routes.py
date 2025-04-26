from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Any, Optional
import logging

# Import database functions for REST endpoints
from backend.src.database.db import (
    get_transcript,
    get_user_transcripts,
    get_organized_notes,
    get_user_notes,
    get_flagged_concepts,
    get_other_concepts
)

# Set up logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Health check endpoint
@router.get("/health")
async def health_check() -> Dict[str, str]:
    """
    Simple health check endpoint to verify API is up and running
    """
    return {"status": "healthy"}

# Transcript endpoints
@router.get("/transcripts/{transcript_id}")
async def get_transcript_endpoint(transcript_id: str) -> Dict[str, Any]:
    """
    Get a specific transcript by ID
    """
    transcript = await get_transcript(transcript_id)
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")
    return transcript.dict()

@router.get("/transcripts")
async def get_user_transcripts_endpoint(user_id: str) -> List[Dict[str, Any]]:
    """
    Get all transcripts for a specific user
    """
    transcripts = await get_user_transcripts(user_id)
    return [transcript.dict() for transcript in transcripts]

# Notes endpoints
@router.get("/notes/{notes_id}")
async def get_notes_endpoint(notes_id: str) -> Dict[str, Any]:
    """
    Get organized notes by ID
    """
    notes = await get_organized_notes(notes_id)
    if not notes:
        raise HTTPException(status_code=404, detail="Notes not found")
    return notes.dict()

@router.get("/notes")
async def get_user_notes_endpoint(user_id: str) -> List[Dict[str, Any]]:
    """
    Get all organized notes for a specific user
    """
    notes = await get_user_notes(user_id)
    return [note.dict() for note in notes]

# Concepts endpoints
@router.get("/concepts/flagged")
async def get_flagged_concepts_endpoint(user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get flagged concepts, optionally filtered by user
    """
    concepts = await get_flagged_concepts(user_id)
    return [concept.dict() for concept in concepts]

@router.get("/concepts/other")
async def get_other_concepts_endpoint(transcript_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get other (detected but not flagged) concepts, optionally filtered by transcript
    """
    concepts = await get_other_concepts(transcript_id)
    return [concept.dict() for concept in concepts]

# This file would contain additional REST endpoints as needed 