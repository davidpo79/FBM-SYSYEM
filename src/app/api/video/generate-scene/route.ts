import { NextRequest, NextResponse } from "next/server";
import { startVideoGeneration } from "@/lib/veo";
import { generateTTS } from "@/lib/tts";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logApiCall } from "@/lib/api-log";

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (!buckets?.find((b) => b.name === "videos")) {
    await supabaseAdmin.storage.createBucket("videos", {
      public: true,
      fileSizeLimit: 104857600, // 100MB
    });
  }
}

/**
 * POST /api/video/generate-scene
 *
 * Starts Veo video clip generation AND generates TTS audio for one scene.
 * Returns immediately with:
 * - veoOperationName: operation ID to poll
 * - ttsUrl: URL of uploaded TTS audio
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const {
      projectId,
      scriptIndex,
      sceneNumber,
      imagePrompt,
      voiceOverText,
      voiceSettings,
      sceneDuration,
    } = await req.json();

    if (!projectId || !imagePrompt || !voiceOverText) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    await ensureBucket();

    // 1. Start Veo video generation (returns immediately with operation ID)
    const veoPrompt = `Create a professional cinematic B-Roll video clip.
SCENE: ${imagePrompt}
STYLE: Photorealistic, cinematic lighting, smooth camera movement,
professional color grading, no text or watermarks,
high production value marketing video aesthetic.`;

    const operation = await startVideoGeneration(veoPrompt, "16:9");

    // 2. Generate TTS audio (with fallback to silence)
    const ttsResult = await generateTTS(
      voiceOverText,
      voiceSettings?.voice || "female",
      voiceSettings?.rate || 1.0,
      voiceSettings?.pitch || 0,
      sceneDuration || 12,
    );

    // Upload TTS to Supabase
    const ttsPath = `${projectId}/script-${scriptIndex}/scene-${sceneNumber}-vo.mp3`;
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("videos")
      .upload(ttsPath, ttsResult.audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadErr) {
      console.error("TTS upload error:", uploadErr);
    }

    const { data: ttsUrlData } = supabaseAdmin.storage
      .from("videos")
      .getPublicUrl(ttsPath);

    logApiCall({
      endpoint: "/api/video/generate-scene",
      projectId,
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({
      veoOperationName: operation.name,
      ttsUrl: ttsUrlData.publicUrl,
      ttsAvailable: ttsResult.usedTTS,
      sceneNumber,
    });
  } catch (error) {
    console.error("generate-scene error:", error);
    logApiCall({
      endpoint: "/api/video/generate-scene",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown",
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start scene generation" },
      { status: 500 },
    );
  }
}
