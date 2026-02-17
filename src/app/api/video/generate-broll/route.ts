import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/gemini";
import { logApiCall } from "@/lib/api-log";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid prompt" },
        { status: 400 },
      );
    }

    const fullPrompt = `Create a professional, high-quality, cinematic background image for a video B-Roll scene.

SCENE: ${prompt}

REQUIREMENTS:
- Photorealistic, ultra high quality
- 16:9 landscape format for video
- Cinematic lighting with depth
- NO text, words, letters, or watermarks on the image
- NO UI elements or overlays
- Rich color grading, professional atmosphere
- This image will be used as a B-Roll background in a marketing video`;

    const { base64, mimeType } = await generateImage(fullPrompt, "16:9");

    logApiCall({
      endpoint: "/api/video/generate-broll",
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ imageBase64: base64, mimeType });
  } catch (error) {
    console.error("generate-broll error:", error);
    logApiCall({
      endpoint: "/api/video/generate-broll",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate B-Roll image" },
      { status: 500 },
    );
  }
}
