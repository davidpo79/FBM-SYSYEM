import { GoogleGenAI } from "@google/genai";

let _ai: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!_ai) {
    _ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });
  }
  return _ai;
}

export async function generateImage(
  prompt: string,
  aspectRatio?: string,
): Promise<{ base64: string; mimeType: string }> {
  const ai = getClient();

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
}
