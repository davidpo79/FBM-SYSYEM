import { NextRequest, NextResponse } from "next/server";
import { startVideoGeneration } from "@/lib/veo";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logApiCall } from "@/lib/api-log";

const TTS_API_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";

async function generateTTS(
  text: string,
  voice: "male" | "female",
  rate: number,
  pitch: number,
): Promise<Buffer> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("Google TTS API key not configured");

  const voiceNames = {
    neural2: voice === "male" ? "he-IL-Neural2-B" : "he-IL-Neural2-A",
    wavenet: voice === "male" ? "he-IL-Wavenet-B" : "he-IL-Wavenet-A",
    standard: voice === "male" ? "he-IL-Standard-B" : "he-IL-Standard-A",
  };

  for (const voiceName of Object.values(voiceNames)) {
    const response = await fetch(`${TTS_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "he-IL", name: voiceName },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: rate ?? 1.0,
          pitch: pitch ?? 0.0,
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return Buffer.from(data.audioContent, "base64");
    }
  }

  throw new Error("Failed to generate TTS with all voice types");
}

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

    // 2. Generate TTS audio (synchronous, fast)
    const ttsBuffer = await generateTTS(
      voiceOverText,
      voiceSettings?.voice || "female",
      voiceSettings?.rate || 1.0,
      voiceSettings?.pitch || 0,
    );

    // Upload TTS to Supabase
    const ttsPath = `${projectId}/script-${scriptIndex}/scene-${sceneNumber}-vo.mp3`;
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("videos")
      .upload(ttsPath, ttsBuffer, {
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
