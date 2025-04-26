import os
from typing import Dict, Any
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

class GeminiService:
    def __init__(self):
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-pro')
    
    async def process_audio_transcript(self, transcript: str) -> Dict[str, Any]:
        """
        Process an audio transcript using Gemini API.
        
        Args:
            transcript (str): The text transcript from audio
            
        Returns:
            Dict containing processed information including:
            - main_concepts: List of main concepts discussed
            - technical_terms: Dict of terms and their explanations
            - summary: Brief summary of the content
        """
        prompt = f"""
        Analyze the following lecture transcript and provide a structured analysis:
        
        Transcript:
        {transcript}
        
        Please provide the following in a clear, structured format:
        1. Main concepts discussed (list the 3-5 most important concepts)
        2. Technical terms that need explanation (with brief, clear definitions)
        3. A 2-3 sentence summary of the key points
        """
        
        response = await self.model.generate_content(prompt)
        response_text = response.text
        
        # TODO: Add more sophisticated parsing of the response
        # For now, returning the raw response
        return {
            "raw_response": response_text,
            "status": "success"
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