import os
from typing import Dict, Any, List, Optional
import google.generativeai as genai
import json
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self):
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('models/gemini-2.5-flash-preview-04-17')  # Using Gemini 2.5 Flash
        self.flagged_concepts: List[Dict[str, Any]] = []  # Track flagged concepts
    
    def _safe_api_call(self, prompt: str) -> Optional[str]:
        """
        Makes a safe API call with error handling.
        
        Args:
            prompt: The prompt to send to the model
            
        Returns:
            The response text or None if there was an error
        """
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            logger.error(f"API call error: {str(e)}")
            return None

    async def process_audio_transcript(self, transcript: str, previous_transcript: str = "") -> Dict[str, Any]:
        """
        Process an audio transcript using Gemini API.
        
        Args:
            transcript (str): The full text transcript from audio
            previous_transcript (str): The previous transcript (for incremental processing)
            
        Returns:
            Dict containing:
            - concepts: List of identified concepts with their locations in the text
            - current_concept: Currently discussed concept
            - new_content: True if new content was detected
            - flagged_history: History of flagged concepts
        """
        # Check if there's new content to process
        has_new_content = len(transcript) > len(previous_transcript)
        
        # If no new content, return previous concepts without processing
        if not has_new_content and hasattr(self, 'last_concepts'):
            return {
                "concepts": self.last_concepts,
                "current_concept": self.last_current_concept if hasattr(self, 'last_current_concept') else None,
                "new_content": False,
                "flagged_history": self.flagged_concepts,
                "status": "success"
            }
            
        # First, identify and structure the concepts from the transcript
        concepts_prompt = f"""
        Analyze this lecture transcript and identify key concepts that students might find challenging.
        Focus on the most recent/last part of the transcript to identify what's currently being discussed.
        For each concept:
        1. Identify the concept name
        2. Extract the relevant text snippet where it's discussed
        3. Determine the start and end position of the concept in the text
        4. Assess potential difficulty (1-5 scale)
        5. Indicate if this is currently being discussed (true/false)

        Format the response as a JSON array with objects containing:
        - concept_name
        - text_snippet
        - start_position (approximate char position in transcript)
        - end_position
        - difficulty_level
        - is_current

        Transcript:
        {transcript}
        """
        
        concepts_response_text = self._safe_api_call(concepts_prompt)
        if concepts_response_text is None:
            concepts_data = [{
                "concept_name": "Error connecting to API",
                "text_snippet": transcript[:100] + "...",
                "start_position": 0,
                "end_position": len(transcript),
                "difficulty_level": 1,
                "is_current": True
            }]
        else:
            try:
                concepts_data = json.loads(concepts_response_text)
            except json.JSONDecodeError:
                # Fallback if response is not valid JSON
                concepts_data = [{
                    "concept_name": "Error parsing concepts",
                    "text_snippet": transcript[:100] + "...",
                    "start_position": 0,
                    "end_position": len(transcript),
                    "difficulty_level": 1,
                    "is_current": True
                }]

        # Identify current concepts being discussed
        current_concepts = [c for c in concepts_data if c.get("is_current", False)]
        current_concept = current_concepts[0] if current_concepts else (concepts_data[-1] if concepts_data else None)
        
        # Store for future reference
        self.last_concepts = concepts_data
        self.last_current_concept = current_concept

        return {
            "concepts": concepts_data,
            "current_concept": current_concept,
            "new_content": has_new_content,
            "flagged_history": self.flagged_concepts,
            "status": "success"
        }
    
    async def explain_concept(self, concept_name: str, context: str) -> Dict[str, Any]:
        """
        Generate a detailed explanation for a specific concept.
        
        Args:
            concept_name: The name of the concept to explain
            context: The relevant context from the lecture
            
        Returns:
            Dict containing the explanation and examples
        """
        prompt = f"""
        Explain the concept of "{concept_name}" in detail.
        
        Context from lecture:
        {context}

        Provide:
        1. A clear, simple explanation
        2. Three concrete examples
        3. Common misconceptions
        4. Related concepts to explore
        
        Format as JSON with:
        - explanation
        - examples (array)
        - misconceptions (array)
        - related_concepts (array)
        """
        
        response_text = self._safe_api_call(prompt)
        if response_text is None:
            return {
                "explanation": {
                    "explanation": f"Unable to generate explanation for {concept_name} at this time.",
                    "examples": [],
                    "misconceptions": [],
                    "related_concepts": []
                },
                "status": "error",
                "message": "API connection error"
            }
            
        try:
            explanation_data = json.loads(response_text)
            # Add to flagged history with proper timestamp
            timestamp = datetime.now().isoformat()
            self.flagged_concepts.append({
                "concept": concept_name,
                "timestamp": timestamp,
                "context": context,
                "explanation": explanation_data
            })
            return {
                "explanation": explanation_data,
                "timestamp": timestamp,
                "status": "success"
            }
        except json.JSONDecodeError:
            return {
                "explanation": {
                    "explanation": response_text[:500] + "...",  # Include partial text
                    "examples": [],
                    "misconceptions": [],
                    "related_concepts": []
                },
                "status": "error",
                "message": "Failed to parse explanation"
            }
    
    async def evaluate_understanding(self, lecture_transcript: str, user_explanation: str) -> Dict[str, Any]:
        """
        Evaluate user's understanding based on their explanation and generate follow-up questions.
        
        Args:
            lecture_transcript: Original lecture content
            user_explanation: User's audio transcript explaining the concept
            
        Returns:
            Dict containing evaluation, feedback, and follow-up questions
        """
        prompt = f"""
        Compare the user's explanation with the original lecture content and evaluate their understanding.

        Original Lecture:
        {lecture_transcript}

        User's Explanation:
        {user_explanation}

        Provide a detailed analysis in JSON format with:
        1. Understanding level (1-5 scale)
        2. Accurate points they made
        3. Misconceptions or gaps
        4. Follow-up questions to deepen understanding
        5. Suggestions for improvement

        Format as JSON with:
        - understanding_level (number)
        - accurate_points (array)
        - gaps (array)
        - follow_up_questions (array)
        - improvement_suggestions (array)
        """

        response_text = self._safe_api_call(prompt)
        if response_text is None:
            return {
                "evaluation": {
                    "understanding_level": 0,
                    "accurate_points": [],
                    "gaps": ["Unable to evaluate due to API error"],
                    "follow_up_questions": ["Can you try explaining again?"],
                    "improvement_suggestions": []
                },
                "status": "error",
                "message": "API connection error"
            }
            
        try:
            evaluation_data = json.loads(response_text)
            return {
                "evaluation": evaluation_data,
                "status": "success"
            }
        except json.JSONDecodeError:
            return {
                "evaluation": {
                    "understanding_level": 0,
                    "accurate_points": [],
                    "gaps": ["Error in processing your explanation"],
                    "follow_up_questions": ["Can you try explaining in a different way?"],
                    "improvement_suggestions": ["Be more specific and structured in your explanation"]
                },
                "status": "error",
                "message": "Failed to parse evaluation"
            }
    
    async def get_flagged_history(self) -> Dict[str, Any]:
        """
        Retrieve the history of flagged concepts.
        
        Returns:
            Dict containing the history of flagged concepts
        """
        return {
            "flagged_concepts": self.flagged_concepts,
            "status": "success"
        } 
        