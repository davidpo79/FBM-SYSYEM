import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });

export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  _maxTokens = 8000,
): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: userMessage,
    config: {
      temperature: 0.7,
      ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Empty response from Gemini");
  }
  return text;
}
