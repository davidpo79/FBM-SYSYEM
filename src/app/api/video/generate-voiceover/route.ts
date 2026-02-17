import { NextRequest, NextResponse } from "next/server";
import { generateTTSBase64 } from "@/lib/tts";
import { logApiCall } from "@/lib/api-log";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { text, voice, speakingRate, pitch } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid text" },
        { status: 400 },
      );
    }

    const audioContent = await generateTTSBase64(
      text,
      voice === "male" ? "male" : "female",
      speakingRate ?? 1.0,
      pitch ?? 0.0,
    );

    logApiCall({
      endpoint: "/api/video/generate-voiceover",
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ audioContent });
  } catch (error) {
    console.error("generate-voiceover error:", error);
    logApiCall({
      endpoint: "/api/video/generate-voiceover",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate voice over" },
      { status: 500 },
    );
  }
}
