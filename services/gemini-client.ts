import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

// "gemini-flash-latest" always points at Google's current recommended
// Flash-tier model, so this stays correct as Google ships new versions
// instead of pinning to a version that later gets retired.
export const AI_MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-latest";
