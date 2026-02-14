import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export async function generateImage(
  prompt: string,
): Promise<{ base64: string; mimeType: string }> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-preview-image-generation",
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      // @ts-expect-error - responseModalities supported but not yet in types
      responseModalities: ["IMAGE"],
    },
  });

  // Extract image from response
  const parts = result.response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData) {
      return {
        base64: part.inlineData.data!,
        mimeType: part.inlineData.mimeType!,
      };
    }
  }

  throw new Error("No image generated in Gemini response");
}
