import { GoogleGenAI } from "@google/genai";

let _ai: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!_ai) {
    _ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });
  }
  return _ai;
}

const MAX_RETRIES = 2;
const RETRY_DELAYS = [2000, 4000]; // ms between retries

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callAI(
  systemPrompt: string,
  userMessage: string,
  _maxTokens = 8000,
  options?: { jsonMode?: boolean },
): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await getClient().models.generateContent({
        model: "gemini-2.5-flash",
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
    } catch (e) {
      lastError = e;
      if (attempt < MAX_RETRIES) {
        console.warn(`callAI attempt ${attempt + 1} failed, retrying in ${RETRY_DELAYS[attempt]}ms...`, e instanceof Error ? e.message : e);
        await sleep(RETRY_DELAYS[attempt]);
      }
    }
  }

  throw lastError;
}
