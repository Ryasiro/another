import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini API Key from environment or fallback
const apiKey = process.env.GEMINI_API_KEY || '';

// Initialize Google GenAI client
// ponytail: Using standard GoogleGenerativeAI client.
export const gemini = new GoogleGenerativeAI(apiKey);

// Default models to use for Gemini API
// gemini-3.5-flash is the latest frontier model (July 2026), supports free tier
export const DEFAULT_MODEL = process.env.GEMINI_DEFAULT_MODEL || 'gemini-3.5-flash';
export const PRECISE_MODEL = process.env.GEMINI_PRECISE_MODEL || 'gemini-3.5-flash';
