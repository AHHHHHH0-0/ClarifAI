import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
  }

  async processAudioTranscript(transcript: string) {
    try {
      const prompt = `
        Analyze the following lecture transcript and identify key concepts:
        ${transcript}
        
        Please provide:
        1. Main concepts discussed
        2. Technical terms that might need explanation
        3. Related concepts for context
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Error processing with Gemini:", error);
      throw error;
    }
  }
}
