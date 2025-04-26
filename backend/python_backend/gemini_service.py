import os
from typing import Dict, Any, List, Optional
import google.generativeai as genai
import json
import re
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
    
    def _clean_and_parse_json(self, text: Optional[str]) -> Dict[str, Any]:
        """
        Cleans response text that might be wrapped in markdown code blocks
        and attempts to parse it as JSON.
        
        Args:
            text: Response text that might contain JSON
            
        Returns:
            Parsed JSON object or fallback object on error
        """
        if text is None:
            return {}
        
        # Log the original text for debugging
        logger.debug(f"Original response: {text[:500]}...")
        
        # Remove markdown code block markers
        # Pattern for code blocks: ```json ... ```
        cleaned_text = re.sub(r'```(?:json)?\n?', '', text)
        cleaned_text = re.sub(r'```\n?', '', cleaned_text)
        
        # Try to extract JSON-like content with { }
        json_match = re.search(r'({[\s\S]*})', cleaned_text)
        if json_match:
            cleaned_text = json_match.group(1)
        
        try:
            return json.loads(cleaned_text)
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error: {str(e)}")
            logger.error(f"Cleaned text: {cleaned_text[:500]}...")
            
            # Try a more aggressive approach for malformed JSON
            try:
                # Handle potential non-standard JSON (like duplicate keys)
                # by parsing line by line and handling duplicates
                result = {}
                # Match any key-value pairs like "key": value
                pattern = r'"([^"]+)"\s*:\s*("(?:\\.|[^"\\])*"|[^",\s\]\}]+|\[[^\]]*\]|\{[^\}]*\})'
                for match in re.finditer(pattern, cleaned_text):
                    key, value = match.groups()
                    try:
                        # Try to parse the value
                        parsed_value = json.loads(value)
                        result[key] = parsed_value
                    except:
                        # If value parsing fails, use it as a string
                        result[key] = value
                
                # If result is still empty, we couldn't parse anything useful
                if not result:
                    raise ValueError("Could not extract useful JSON content")
                    
                return result
            except Exception as inner_e:
                logger.error(f"Advanced JSON parsing failed: {str(inner_e)}")
                return {}
    
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
        
        Do not include any markdown formatting - return only valid JSON.

        Transcript:
        {transcript}
        """
        
        concepts_response_text = self._safe_api_call(concepts_prompt)
        
        try:
            # Use our improved JSON parser
            parsed_response = self._clean_and_parse_json(concepts_response_text)
            
            # Handle different response formats
            if isinstance(parsed_response, list):
                concepts_data = parsed_response
            elif isinstance(parsed_response, dict) and any(key.startswith("concept") for key in parsed_response.keys()):
                # Response is a single concept object, wrap in list
                concepts_data = [parsed_response]
            else:
                # Look for any list that might contain concepts
                for key, value in parsed_response.items():
                    if isinstance(value, list) and len(value) > 0:
                        if isinstance(value[0], dict) and "concept_name" in value[0]:
                            concepts_data = value
                            break
                else:
                    # No valid concept list found
                    raise ValueError("Could not find concept list in response")
        except Exception as e:
            logger.error(f"Failed to process concepts: {str(e)}")
            concepts_data = [{
                "concept_name": "Data Structures",
                "text_snippet": transcript[:100] + "...",
                "start_position": 0,
                "end_position": len(transcript),
                "difficulty_level": 3,
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
        - explanation (string)
        - examples (array of strings)
        - misconceptions (array of strings)
        - related_concepts (array of strings)
        
        Return only valid JSON without any markdown formatting.
        """
        
        response_text = self._safe_api_call(prompt)
        
        # Default explanation if parsing fails
        default_explanation = {
            "explanation": f"The concept of {concept_name} refers to {context}",
            "examples": ["Example 1", "Example 2", "Example 3"],
            "misconceptions": ["Common misconception"],
            "related_concepts": ["Related concept"]
        }
        
        try:
            # Use our improved JSON parser
            explanation_data = self._clean_and_parse_json(response_text)
            
            # Ensure all required fields exist
            for field in ["explanation", "examples", "misconceptions", "related_concepts"]:
                if field not in explanation_data:
                    explanation_data[field] = default_explanation[field]
                    
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
        except Exception as e:
            logger.error(f"Failed to explain concept: {str(e)}")
            return {
                "explanation": default_explanation,
                "status": "success",  # Still return success to avoid breaking the UI
                "message": "Used fallback explanation due to parsing issues"
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
        - accurate_points (array of strings)
        - gaps (array of strings)
        - follow_up_questions (array of strings)
        - improvement_suggestions (array of strings)
        
        Return only valid JSON without any markdown formatting.
        """

        response_text = self._safe_api_call(prompt)
        
        # Default evaluation if parsing fails
        default_evaluation = {
            "understanding_level": 3,
            "accurate_points": ["The user showed some understanding of the concept"],
            "gaps": ["Some details were missing"],
            "follow_up_questions": ["Can you elaborate more on the concept?"],
            "improvement_suggestions": ["Consider explaining with examples"]
        }
        
        try:
            # Use our improved JSON parser
            evaluation_data = self._clean_and_parse_json(response_text)
            
            # Ensure all required fields exist
            for field in ["understanding_level", "accurate_points", "gaps", "follow_up_questions", "improvement_suggestions"]:
                if field not in evaluation_data:
                    evaluation_data[field] = default_evaluation[field]
            
            return {
                "evaluation": evaluation_data,
                "status": "success"
            }
        except Exception as e:
            logger.error(f"Failed to evaluate understanding: {str(e)}")
            return {
                "evaluation": default_evaluation,
                "status": "success",  # Still return success to avoid breaking the UI
                "message": "Used fallback evaluation due to parsing issues"
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
        