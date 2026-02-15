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

  // Reinforce aspect ratio in the prompt
  let dimensionHint = "";
  if (aspectRatio === "9:16") {
    dimensionHint =
      "\n\nCRITICAL FORMAT REQUIREMENT: Generate a VERTICAL PORTRAIT image. The image must be TALLER than it is WIDE. Aspect ratio = 9:16 (like a phone screen standing up). Width=1080px, Height=1920px. This is NOT landscape. NOT square. It is PORTRAIT.";
  } else if (aspectRatio === "1:1") {
    dimensionHint =
      "\n\nCRITICAL FORMAT REQUIREMENT: Generate a PERFECT SQUARE image. Width EQUALS height exactly. Aspect ratio = 1:1. NOT landscape. NOT portrait. SQUARE.";
  }

  const enhancedPrompt = prompt + dimensionHint;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-image-preview",
    contents: enhancedPrompt,
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      ...(aspectRatio ? { aspectRatio } : {}),
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
