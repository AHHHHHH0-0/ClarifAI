from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import logging
import os
import jwt
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from services.gemini import GeminiService

# Import database functions for REST endpoints
from database.db import (
    # Uncomment these functions for transcript endpoints
    get_transcript,
    get_user_transcripts,
    get_organized_notes,
    get_user_notes,
    get_flagged_concepts,
    get_other_concepts,
    create_user,
    authenticate_user,
    get_user,
    get_user_by_email
)

# Set up logging
logger = logging.getLogger(__name__)

# Authentication constants
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-for-jwt-please-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# OAuth2 password bearer token setup
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/token")

# Authentication models
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None

class UserResponse(BaseModel):
    email: str
    full_name: Optional[str] = None
    disabled: bool = False
    created_at: datetime
    last_login: Optional[datetime] = None

class FirebaseUser(BaseModel):
    email: str
    name: str | None = None

# Authentication functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except jwt.PyJWTError:
        raise credentials_exception
    user = await get_user_by_email(email=token_data.email)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user = Depends(get_current_user)):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# Create router
router = APIRouter()

# Authentication endpoints
@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/users", response_model=UserResponse)
async def register_user(user_data: UserCreate):
    """
    Register a new user
    """
    # Check if user already exists
    existing_user = await get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
        
    # Create new user
    user = await create_user(
        email=user_data.email,
        password=user_data.password,
        full_name=user_data.full_name
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )
        
    # Convert to response model (exclude password)
    return UserResponse(
        email=user.email,
        full_name=user.full_name,
        disabled=user.disabled,
        created_at=user.created_at,
        last_login=user.last_login
    )

@router.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user = Depends(get_current_active_user)):
    """
    Get information about the currently authenticated user
    """
    return UserResponse(
        email=current_user.email,
        full_name=current_user.full_name,
        disabled=current_user.disabled,
        created_at=current_user.created_at,
        last_login=current_user.last_login
    )

# Health check endpoint
@router.get("/health")
async def health_check() -> Dict[str, str]:
    """
    Simple health check endpoint to verify API is up and running
    """
    return {"status": "healthy"}

# Transcript endpoints - Uncommented to fix 404 error
@router.get("/transcripts/{transcript_id}")
async def get_transcript_endpoint(
    transcript_id: str, 
    # Remove authentication requirement for testing
    # current_user = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """
    Get a specific transcript by ID
    """
    transcript = await get_transcript(transcript_id)
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")
        
    # Skip access check since we removed authentication requirement
    # if transcript.user_id and transcript.user_id != str(current_user.id):
    #     raise HTTPException(status_code=403, detail="Not authorized to access this transcript")
    
    # Check if transcript is a dict with dict function or dict with direct values
    if hasattr(transcript, 'dict'):
        return transcript.dict()
    else:
        # Create a new dict with only the needed properties, excluding lambda functions
        return {
            "id": transcript.get("id"),
            "user_id": transcript.get("user_id"),
            "text": transcript.get("text"),
            "created_at": transcript.get("created_at").isoformat() if hasattr(transcript.get("created_at", ""), "isoformat") else transcript.get("created_at"),
            "lecture_id": transcript.get("lecture_id"),
            "title": transcript.get("title", "Untitled")
        }

@router.get("/transcripts")
async def get_user_transcripts_endpoint(
    # Remove the current_user dependency for testing
    # current_user = Depends(get_current_active_user)
) -> List[Dict[str, Any]]:
    """
    Get all transcripts for the current user
    """
    # For testing, pass a dummy user ID since we removed the current_user dependency
    transcripts = await get_user_transcripts("test_user_id")
    
    # Process each transcript properly
    result = []
    for transcript in transcripts:
        if hasattr(transcript, 'dict'):
            result.append(transcript.dict())
        else:
            # Create a new dict with only the needed properties, excluding lambda functions
            result.append({
                "id": transcript.get("id", ""),
                "user_id": transcript.get("user_id", ""),
                "text": transcript.get("text", ""),
                "created_at": transcript.get("created_at").isoformat() if hasattr(transcript.get("created_at", ""), "isoformat") else transcript.get("created_at", ""),
                "_id": transcript.get("_id", ""),
                "title": transcript.get("title", "Untitled")
            })
    return result

# Notes endpoints - Uncommented to maintain consistency
@router.get("/notes/{notes_id}")
async def get_notes_endpoint(
    notes_id: str,
    current_user = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """
    Get specific organized notes by ID
    """
    notes = await get_organized_notes(notes_id)
    if not notes:
        raise HTTPException(status_code=404, detail="Notes not found")
        
    # Check if user has access to these notes
    if notes.user_id and notes.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access these notes")
        
    return notes.dict()

@router.get("/notes")
async def get_user_notes_endpoint(
    current_user = Depends(get_current_active_user)
) -> List[Dict[str, Any]]:
    """
    Get all organized notes for the current user
    """
    notes = await get_user_notes(str(current_user.id))
    return [note.dict() for note in notes]

# Flagged Concepts - Uncommented to maintain consistency
@router.get("/concepts/flagged")
async def get_flagged_concepts_endpoint(
    current_user = Depends(get_current_active_user)
) -> List[Dict[str, Any]]:
    """
    Get flagged concepts for the current user
    """
    concepts = await get_flagged_concepts(user_id=str(current_user.id))
    return [concept.dict() for concept in concepts]

@router.get("/concepts/other")
async def get_other_concepts_endpoint(
    transcript_id: Optional[str] = None,
    current_user = Depends(get_current_active_user)
) -> List[Dict[str, Any]]:
    """
    Get other (detected but not flagged) concepts, optionally filtered by transcript
    """
    # If transcript_id provided, verify user has access to it
    if transcript_id:
        transcript = await get_transcript(transcript_id)
        if not transcript:
            raise HTTPException(status_code=404, detail="Transcript not found")
            
        if transcript.user_id and transcript.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized to access this transcript's concepts")
    
    concepts = await get_other_concepts(transcript_id)
    return [concept.dict() for concept in concepts]

gemini_service = GeminiService()

class ExplainRequest(BaseModel):
    text: str

@router.post("/explain")
async def explain_concept(request: ExplainRequest):
    try:
        explanation = gemini_service._safe_api_call(request.text)
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini error: {str(e)}")

@router.get("/debug/token")
async def debug_get_token() -> Dict[str, str]:
    """
    Debug endpoint to get a token for testing (REMOVE IN PRODUCTION)
    """
    access_token = create_access_token(
        data={"sub": "test@example.com"}, expires_delta=timedelta(days=30)
    )
    return {"access_token": access_token, "token_type": "bearer"}

# This file would contain additional REST endpoints as needed 