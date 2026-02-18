import { GoogleGenAI } from "@google/genai";

let _ai: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!_ai) {
    _ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });
  }
  return _ai;
}

export async function callAI(
  systemPrompt: string,
  userMessage: string,
  _maxTokens = 8000,
  options?: { jsonMode?: boolean },
): Promise<string> {
  const response = await getClient().models.generateContent({
    model: "gemini-2.0-flash",
    contents: userMessage,
    config: {
      temperature: 0.7,
      ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
      ...(options?.jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Empty response from Gemini");
  }
  return text;
}
