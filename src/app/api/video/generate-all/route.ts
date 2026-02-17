import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateImage } from "@/lib/gemini";
import { logApiCall } from "@/lib/api-log";
import type { AdaptedScript, VoiceSettings, SceneResult } from "@/lib/video-types";

const TTS_API_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";

async function generateVoiceOver(
  text: string,
  settings: VoiceSettings,
): Promise<Buffer> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("Google TTS API key not configured");

  const voiceNames = {
    neural2: settings.voice === "male" ? "he-IL-Neural2-B" : "he-IL-Neural2-A",
    wavenet: settings.voice === "male" ? "he-IL-Wavenet-B" : "he-IL-Wavenet-A",
    standard: settings.voice === "male" ? "he-IL-Standard-B" : "he-IL-Standard-A",
  };

  // Try voices in order: Neural2 -> Wavenet -> Standard
  for (const voiceName of Object.values(voiceNames)) {
    const response = await fetch(`${TTS_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "he-IL", name: voiceName },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: settings.rate ?? 1.0,
          pitch: settings.pitch ?? 0.0,
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return Buffer.from(data.audioContent, "base64");
    }
  }

  throw new Error("Failed to generate voice over with all voice types");
}

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (!buckets?.find((b) => b.name === "videos")) {
    await supabaseAdmin.storage.createBucket("videos", {
      public: true,
      fileSizeLimit: 52428800, // 50MB
    });
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { projectId, adaptedScript, voiceSettings, scriptIndex } =
      (await req.json()) as {
        projectId: string;
        adaptedScript: AdaptedScript;
        voiceSettings: VoiceSettings;
        scriptIndex: number;
      };

    if (!projectId || !adaptedScript?.scenes) {
      return NextResponse.json(
        { error: "Missing projectId or adaptedScript" },
        { status: 400 },
      );
    }

    // Ensure storage bucket exists
    await ensureBucket();

    const sceneResults: SceneResult[] = [];
    const storagePath = `${projectId}`;

    for (const scene of adaptedScript.scenes) {
      const result: SceneResult = {
        number: scene.number,
        type: "b-roll",
      };

      // Generate B-Roll image
      if (scene.imagePrompt) {
        try {
          const fullPrompt = `Create a professional, high-quality, cinematic background image for a video B-Roll scene.
SCENE: ${scene.imagePrompt}
REQUIREMENTS:
- Photorealistic, ultra high quality, 16:9 landscape format
- Cinematic lighting with depth
- NO text, words, letters, or watermarks
- Rich color grading, professional atmosphere`;

          const { base64, mimeType } = await generateImage(fullPrompt, "16:9");

          const imgFileName = `${storagePath}/scene-${scene.number}-broll.png`;
          const { error: uploadErr } = await supabaseAdmin.storage
            .from("videos")
            .upload(imgFileName, Buffer.from(base64, "base64"), {
              contentType: mimeType || "image/png",
              upsert: true,
            });

          if (uploadErr) {
            console.error(`Upload error for scene ${scene.number} image:`, uploadErr);
          } else {
            const { data: urlData } = supabaseAdmin.storage
              .from("videos")
              .getPublicUrl(imgFileName);
            result.imageUrl = urlData.publicUrl;
          }
        } catch (e) {
          console.error(`Image generation error for scene ${scene.number}:`, e);
        }
      }

      // Generate Voice Over
      if (scene.voiceOverText) {
        try {
          const audioBuffer = await generateVoiceOver(
            scene.voiceOverText,
            voiceSettings,
          );

          const audioFileName = `${storagePath}/scene-${scene.number}-vo.mp3`;
          const { error: uploadErr } = await supabaseAdmin.storage
            .from("videos")
            .upload(audioFileName, audioBuffer, {
              contentType: "audio/mpeg",
              upsert: true,
            });

          if (uploadErr) {
            console.error(`Upload error for scene ${scene.number} audio:`, uploadErr);
          } else {
            const { data: urlData } = supabaseAdmin.storage
              .from("videos")
              .getPublicUrl(audioFileName);
            result.voiceOverUrl = urlData.publicUrl;
          }
        } catch (e) {
          console.error(`Voice over error for scene ${scene.number}:`, e);
        }
      }

      sceneResults.push(result);
    }

    // Build timeline JSON
    let currentTime = 0;
    const timeline = {
      projectId,
      totalDuration: adaptedScript.totalDuration,
      fps: 30,
      resolution: "1920x1080",
      format: "16:9",
      scenes: adaptedScript.scenes.map((scene) => {
        const entry = {
          number: scene.number,
          type: "b-roll" as const,
          startTime: currentTime,
          endTime: currentTime + scene.duration,
          image: `scene-${scene.number}-broll.png`,
          audio: `scene-${scene.number}-vo.mp3`,
          voiceOverText: scene.voiceOverText,
          notes: scene.notes,
        };

        currentTime += scene.duration;
        return entry;
      }),
    };

    // Upload timeline
    const timelineFileName = `${storagePath}/timeline.json`;
    await supabaseAdmin.storage
      .from("videos")
      .upload(timelineFileName, Buffer.from(JSON.stringify(timeline, null, 2)), {
        contentType: "application/json",
        upsert: true,
      });

    // Save to database
    const { error: dbError } = await supabaseAdmin
      .from("video_projects")
      .upsert(
        {
          project_id: projectId,
          script_index: scriptIndex ?? 0,
          adapted_script: adaptedScript,
          voice_settings: voiceSettings,
          scenes_data: sceneResults,
          status: "ready",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "project_id,script_index" },
      );

    if (dbError) {
      console.error("DB save error:", dbError);
    }

    logApiCall({
      endpoint: "/api/video/generate-all",
      projectId,
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      scenes: sceneResults,
      timeline,
    });
  } catch (error) {
    console.error("generate-all error:", error);
    logApiCall({
      endpoint: "/api/video/generate-all",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate video assets" },
      { status: 500 },
    );
  }
}
