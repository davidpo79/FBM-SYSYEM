import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { startVideoGeneration, pollVideoOperation, downloadVeoVideo } from "@/lib/veo";
import { composeVideo } from "@/lib/video-compose";
import { logApiCall } from "@/lib/api-log";
import type { AdaptedScript, VoiceSettings } from "@/lib/video-types";
import fs from "fs";
import path from "path";
import os from "os";

// Allow up to 5 minutes for the full pipeline
export const maxDuration = 300;

const TTS_API_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";

async function generateTTS(
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

  throw new Error("Failed to generate TTS");
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
 * POST /api/video/generate-all
 *
 * Full pipeline: Veo clips + TTS + FFmpeg composition → final MP4
 *
 * Steps:
 * 1. Start Veo generation for all 5 scenes (parallel)
 * 2. Generate TTS for all scenes (parallel)
 * 3. Poll Veo until all clips ready
 * 4. Compose final MP4 with FFmpeg
 * 5. Upload to Supabase
 * 6. Return final video URL
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let tmpDir = "";

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

    await ensureBucket();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fbm-pipeline-"));

    // ── Step 1 + 2: Start Veo + TTS for all scenes in parallel ──
    const sceneJobs = adaptedScript.scenes.map(async (scene, i) => {
      const veoPrompt = `Create a professional cinematic B-Roll video clip.
SCENE: ${scene.imagePrompt}
STYLE: Photorealistic, cinematic lighting, smooth camera movement,
professional color grading, no text or watermarks,
high production value marketing video aesthetic.`;

      // Start Veo and generate TTS concurrently
      const [operation, ttsBuffer] = await Promise.all([
        startVideoGeneration(veoPrompt, "16:9"),
        generateTTS(scene.voiceOverText, voiceSettings),
      ]);

      // Write TTS to temp file
      const audioPath = path.join(tmpDir, `vo-${i}.mp3`);
      fs.writeFileSync(audioPath, ttsBuffer);

      return { sceneNumber: scene.number, operation, audioPath, scene };
    });

    const jobs = await Promise.all(sceneJobs);

    // ── Step 3: Poll Veo operations until all clips are ready ──
    const MAX_POLL_TIME = 240000; // 4 minutes max
    const POLL_INTERVAL = 10000;  // 10 seconds
    const pollStart = Date.now();
    const videoFiles: Record<number, string> = {};

    while (Object.keys(videoFiles).length < jobs.length) {
      if (Date.now() - pollStart > MAX_POLL_TIME) {
        throw new Error("Video generation timed out after 4 minutes");
      }

      await new Promise((r) => setTimeout(r, POLL_INTERVAL));

      for (const job of jobs) {
        if (videoFiles[job.sceneNumber]) continue; // Already done

        const result = await pollVideoOperation(job.operation);

        if (result.done && !result.error) {
          // Download video clip to temp path
          const clipPath = await downloadVeoVideo(result.operation);
          const videoPath = path.join(tmpDir, `clip-${job.sceneNumber}.mp4`);
          fs.copyFileSync(clipPath, videoPath);
          videoFiles[job.sceneNumber] = videoPath;
          // Clean up Veo download temp dir
          try { fs.rmSync(path.dirname(clipPath), { recursive: true, force: true }); } catch {}
        } else if (result.done && result.error) {
          throw new Error(`Scene ${job.sceneNumber} failed: ${result.error}`);
        }
      }
    }

    // ── Step 4: Compose final MP4 ──
    const composeScenes = jobs.map((job) => ({
      videoPath: videoFiles[job.sceneNumber],
      audioPath: job.audioPath,
      subtitleText: job.scene.voiceOverText,
      duration: job.scene.duration,
    }));

    // Check for background music
    const musicCandidates = [
      path.join(process.cwd(), "public", "music", "background.mp3"),
      path.join(process.cwd(), "public", "music", "bg-music.mp3"),
    ];
    const musicPath = musicCandidates.find((p) => fs.existsSync(p));

    const outputPath = path.join(tmpDir, "final-video.mp4");
    await composeVideo({
      scenes: composeScenes,
      musicPath,
      musicVolume: 0.12,
      outputPath,
    });

    // ── Step 5: Upload final video to Supabase ──
    const finalBuffer = fs.readFileSync(outputPath);
    const storagePath = `${projectId}/script-${scriptIndex}/final-video.mp4`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from("videos")
      .upload(storagePath, finalBuffer, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadErr) {
      throw new Error(`Upload failed: ${uploadErr.message}`);
    }

    const { data: urlData } = supabaseAdmin.storage
      .from("videos")
      .getPublicUrl(storagePath);

    // Save to database
    await supabaseAdmin
      .from("video_projects")
      .upsert(
        {
          project_id: projectId,
          script_index: scriptIndex ?? 0,
          adapted_script: adaptedScript,
          voice_settings: voiceSettings,
          scenes_data: jobs.map((j) => ({
            number: j.sceneNumber,
            type: "b-roll" as const,
            videoUrl: urlData.publicUrl,
          })),
          status: "ready",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "project_id,script_index" },
      );

    logApiCall({
      endpoint: "/api/video/generate-all",
      projectId,
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      videoUrl: urlData.publicUrl,
    });
  } catch (error) {
    console.error("generate-all error:", error);
    logApiCall({
      endpoint: "/api/video/generate-all",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown",
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate video" },
      { status: 500 },
    );
  } finally {
    // Cleanup temp files
    if (tmpDir) {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
  }
}
