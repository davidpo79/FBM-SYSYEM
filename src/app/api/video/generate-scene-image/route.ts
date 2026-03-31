import { NextRequest, NextResponse } from "next/server";
import { generateSceneImage } from "@/lib/fal";
import { logApiCall } from "@/lib/api-log";

/**
 * POST /api/video/generate-scene-image
 *
 * Generates a scene image using FLUX (fal.ai).
 * If a referenceImageUrl is provided, uses image-to-image to incorporate
 * the product's visual style. Otherwise falls back to text-to-image.
 *
 * Body:
 *   prompt: string          - Scene description for image generation
 *   referenceImageUrl?: string - Product/website image URL for image-to-image
 *   aspectRatio?: "16:9" | "9:16" | "1:1"
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { prompt, referenceImageUrl, aspectRatio } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid prompt" },
        { status: 400 },
      );
    }

    if (!process.env.FAL_KEY) {
      return NextResponse.json(
        { error: "FAL_KEY not configured. Add your fal.ai API key to environment variables." },
        { status: 500 },
      );
    }

    const fullPrompt = referenceImageUrl
      ? `Professional advertising scene featuring this product. ${prompt}.
         Photorealistic, ultra high quality, cinematic lighting, no text or watermarks.
         Show the product clearly and prominently in the scene.`
      : `Create a professional, high-quality, cinematic scene image.
         SCENE: ${prompt}
         REQUIREMENTS:
         - Photorealistic, ultra high quality
         - Cinematic lighting with depth
         - NO text, words, letters, or watermarks
         - Rich color grading, professional atmosphere`;

    const { base64, mimeType } = await generateSceneImage(
      fullPrompt,
      referenceImageUrl || undefined,
      aspectRatio || "9:16",
    );

    logApiCall({
      endpoint: "/api/video/generate-scene-image",
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ imageBase64: base64, mimeType });
  } catch (error) {
    console.error("generate-scene-image error:", error);
    logApiCall({
      endpoint: "/api/video/generate-scene-image",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate scene image" },
      { status: 500 },
    );
  }
}
