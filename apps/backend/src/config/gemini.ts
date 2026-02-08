import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { env } from './env';
import { logger } from '../lib/logger';

let geminiModel: GenerativeModel | null = null;

// Real Gemini API keys start with "AIzaSy" and are ~39 chars
const KNOWN_PLACEHOLDERS = [
  'your-gemini-api-key-here',,
];

const isValidKey =
  env.GEMINI_API_KEY &&
  !KNOWN_PLACEHOLDERS.includes(env.GEMINI_API_KEY)

if (isValidKey) {
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  geminiModel = genAI.getGenerativeModel({
    model: env.GEMINI_MODEL,
  });
} else {
  logger.warn('⚠️  GEMINI_API_KEY is not set or is invalid. AI features will be disabled.');
  logger.warn('   Set a valid GEMINI_API_KEY in your .env file to enable AI.');
}

export { geminiModel };

export const SYSTEM_PROMPT = `You are a helpful, friendly AI assistant. You provide clear, accurate, and concise responses. You format your responses using markdown when appropriate, including code blocks with language identifiers. If you are unsure about something, you say so honestly.`;
