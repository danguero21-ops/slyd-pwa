import { GoogleGenAI } from '@google/genai';

/** Server-only Gemini client. Never import this module from browser code. */
export const createGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenAI({ apiKey });
};
