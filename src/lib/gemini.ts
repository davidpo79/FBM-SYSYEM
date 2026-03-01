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

export async function generateImage(
  prompt: string,
  aspectRatio?: string,
): Promise<{ base64: string; mimeType: string }> {
  const ai = getClient();
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: prompt,
        config: {
          responseModalities: ["IMAGE"],
          imageConfig: {
            ...(aspectRatio ? { aspectRatio } : {}),
          },
        },
      });

      // Extract image from response parts
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData) {
          return {
            base64: part.inlineData.data ?? "",
            mimeType: part.inlineData.mimeType ?? "image/png",
          };
        }
      }

      throw new Error("No image generated in Gemini response");
    } catch (e) {
      lastError = e;
      if (attempt < MAX_RETRIES) {
        console.warn(`generateImage attempt ${attempt + 1} failed, retrying in ${RETRY_DELAYS[attempt]}ms...`, e instanceof Error ? e.message : e);
        await sleep(RETRY_DELAYS[attempt]);
      }
    }
  }

  throw lastError;
}
