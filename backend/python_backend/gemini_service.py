import os
from typing import Dict, Any, List
import google.generativeai as genai
import json

class GeminiService:
    def __init__(self):
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-pro')
        self.flagged_concepts: List[Dict[str, Any]] = []  # Track flagged concepts
    
    async def process_audio_transcript(self, transcript: str) -> Dict[str, Any]:
        """
        Process an audio transcript using Gemini API.
        
        Args:
            transcript (str): The text transcript from audio
            
        Returns:
            Dict containing:
            - concepts: List of identified concepts with their locations in the text
            - current_concept: Currently discussed concept
            - concept_explanation: Detailed explanation with examples (if requested)
            - flagged_history: History of flagged concepts
        """
        # First, identify and structure the concepts from the transcript
        concepts_prompt = f"""
        Analyze this lecture transcript and identify key concepts that students might find challenging.
        For each concept:
        1. Identify the concept name
        2. Extract the relevant text snippet where it's discussed
        3. Determine the start and end position of the concept in the text
        4. Assess potential difficulty (1-5 scale)

        Format the response as a JSON array with objects containing:
        - concept_name
        - text_snippet
        - start_position (approximate char position in transcript)
        - end_position
        - difficulty_level

        Transcript:
        {transcript}
        """
        
        concepts_response = await self.model.generate_content(concepts_prompt)
        try:
            concepts_data = json.loads(concepts_response.text)
        except json.JSONDecodeError:
            # Fallback if response is not valid JSON
            concepts_data = [{
                "concept_name": "Error parsing concepts",
                "text_snippet": transcript[:100] + "...",
                "start_position": 0,
                "end_position": len(transcript),
                "difficulty_level": 1
            }]

        # Identify the current concept being discussed (last part of transcript)
        current_concept = concepts_data[-1] if concepts_data else None

        return {
            "concepts": concepts_data,
            "current_concept": current_concept,
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
        
        response = await self.model.generate_content(prompt)
        try:
            explanation_data = json.loads(response.text)
            # Add to flagged history
            self.flagged_concepts.append({
                "concept": concept_name,
                "timestamp": "now",  # TODO: Add actual timestamp
                "explanation": explanation_data
            })
            return {
                "explanation": explanation_data,
                "status": "success"
            }
        except json.JSONDecodeError:
            return {
                "explanation": response.text,
                "status": "error",
                "message": "Failed to parse explanation"
            }
    
    async def generate_quiz(self, transcript: str) -> Dict[str, Any]:
        """
        Generate quiz questions based on the transcript content.
        
        Args:
            transcript (str): The text transcript from audio
            
        Returns:
            Dict containing quiz questions and answers
        """
        prompt = f"""
        Based on this lecture transcript, generate 3 quiz questions:
        
        Transcript:
        {transcript}
        
        For each question:
        1. Create a multiple choice question
        2. Provide 4 possible answers
        3. Indicate the correct answer
        4. Add a brief explanation
        """
        
        response = await self.model.generate_content(prompt)
        return {
            "quiz_content": response.text,
            "status": "success"
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

        response = await self.model.generate_content(prompt)
        try:
            evaluation_data = json.loads(response.text)
            return {
                "evaluation": evaluation_data,
                "status": "success"
            }
        except json.JSONDecodeError:
            return {
                "evaluation": response.text,
                "status": "error",
                "message": "Failed to parse evaluation"
            } 