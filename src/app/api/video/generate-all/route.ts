import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getBestVideoFile } from "@/lib/pexels";
import { composeVideo } from "@/lib/video-compose";
import { generateTTS, generateTTSWithTimestamps } from "@/lib/tts";
import { waitForRunwayVideo, buildCinematicPrompt, startRunwayGeneration } from "@/lib/runway";
import { logApiCall } from "@/lib/api-log";
import type { AdaptedScript, VoiceSettings, PexelsVideo, VideoSource } from "@/lib/video-types";
import fs from "fs";
import path from "path";
import os from "os";

export const maxDuration = 300; // 5 minutes

async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (!buckets?.find((b) => b.name === "videos")) {
    await supabaseAdmin.storage.createBucket("videos", {
      public: true,
      fileSizeLimit: 104857600, // 100MB
    });
  }
}

async function downloadFile(url: string, destPath: string): Promise<void> {
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  console.log(`Downloaded: ${destPath} (${buffer.length} bytes)`);
}

interface SelectedScene {
  number: number;
  duration: number;
  voiceOverText: string;
  selectedClip?: PexelsVideo;
  videoPromptEn?: string;
  aiClipUrl?: string;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let tmpDir = "";
  const debug: string[] = [];

  try {
    const { projectId, adaptedScript, voiceSettings, scriptIndex, videoSource } =
      (await req.json()) as {
        projectId: string;
        adaptedScript: AdaptedScript;
        voiceSettings: VoiceSettings;
        scriptIndex: number;
        videoSource?: VideoSource;
      };

    if (!projectId || !adaptedScript?.scenes) {
      return NextResponse.json(
        { error: "Missing projectId or adaptedScript" },
        { status: 400 },
      );
    }

    const source: VideoSource = videoSource || adaptedScript.videoSource || "pexels";
    debug.push(`Video source: ${source}`);

    // Check env vars
    debug.push(`ELEVEN_LABS_API_KEY: ${process.env.ELEVEN_LABS_API_KEY ? "SET" : "NOT SET"}`);
    debug.push(`GOOGLE_TTS_API_KEY: ${process.env.GOOGLE_TTS_API_KEY ? "SET" : "NOT SET"}`);
    debug.push(`PEXELS_API_KEY: ${process.env.PEXELS_API_KEY ? "SET" : "NOT SET"}`);
    debug.push(`RUNWAY_API_KEY: ${process.env.RUNWAY_API_KEY ? "SET" : "NOT SET"}`);

    // Validate scenes based on source
    const selectedScenes: SelectedScene[] = [];
    for (const scene of adaptedScript.scenes) {
      if (source === "pexels" && !scene.selectedClip) {
        return NextResponse.json(
          { error: `סצנה ${scene.number} חסר קליפ וידאו. בחר קליפ לכל סצנה.` },
          { status: 400 },
        );
      }
      if (source === "runway" && !scene.videoPromptEn && !scene.aiClipUrl) {
        return NextResponse.json(
          { error: `סצנה ${scene.number} חסר תיאור AI. ודא שכל הסצנות כוללות videoPromptEn.` },
          { status: 400 },
        );
      }
      selectedScenes.push({
        number: scene.number,
        duration: scene.duration,
        voiceOverText: scene.voiceOverText,
        selectedClip: scene.selectedClip,
        videoPromptEn: scene.videoPromptEn,
        aiClipUrl: scene.aiClipUrl,
      });
    }

    await ensureBucket();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fbm-pipeline-"));
    debug.push(`tmpDir: ${tmpDir}`);

    // ── Step 1: Download/generate clips + Generate TTS (parallel) ──
    const ttsEngines: string[] = [];
    let ttsAvailable = true;
    const useTimestamps = source === "runway"; // Use word-level sync for AI clips

    const jobs = await Promise.all(
      selectedScenes.map(async (scene, i) => {
        let videoPath: string;

        if (source === "runway") {
          // ── Runway AI-generated clip ──
          videoPath = path.join(tmpDir, `clip-${i}.mp4`);

          if (scene.aiClipUrl) {
            // Pre-generated AI clip (already has URL)
            debug.push(`Scene ${i + 1}: Using pre-generated AI clip`);
            await downloadFile(scene.aiClipUrl, videoPath);
          } else {
            // Generate new clip with Runway
            debug.push(`Scene ${i + 1}: Generating AI clip with Runway...`);
            const cinematicPrompt = buildCinematicPrompt(scene.videoPromptEn || "");
            const taskId = await startRunwayGeneration(cinematicPrompt, "9:16", 10);
            const clipUrl = await waitForRunwayVideo(taskId);
            await downloadFile(clipUrl, videoPath);
            debug.push(`Scene ${i + 1}: AI clip ready`);
          }
        } else {
          // ── Pexels stock clip ──
          const clipUrl = getBestVideoFile(scene.selectedClip!);
          if (!clipUrl) throw new Error(`סצנה ${scene.number}: לא נמצא קובץ וידאו`);

          videoPath = path.join(tmpDir, `clip-${i}.mp4`);
          await downloadFile(clipUrl, videoPath);
        }

        // Generate TTS (with timestamps for Runway mode)
        const ttsResult = useTimestamps
          ? await generateTTSWithTimestamps(
              scene.voiceOverText,
              voiceSettings.voice,
              voiceSettings.rate,
              voiceSettings.pitch,
              scene.duration,
            )
          : await generateTTS(
              scene.voiceOverText,
              voiceSettings.voice,
              voiceSettings.rate,
              voiceSettings.pitch,
              scene.duration,
            );

        ttsEngines.push(ttsResult.engine);
        if (!ttsResult.usedTTS) ttsAvailable = false;

        const audioPath = path.join(tmpDir, `vo-${i}.wav`);
        fs.writeFileSync(audioPath, ttsResult.audioBuffer);
        debug.push(`Scene ${i + 1}: TTS=${ttsResult.engine}, audio=${ttsResult.audioBuffer.length}b${ttsResult.wordTimestamps ? `, words=${ttsResult.wordTimestamps.length}` : ""}`);

        return {
          videoPath,
          audioPath,
          subtitleText: scene.voiceOverText,
          duration: scene.duration,
        };
      }),
    );

    debug.push(`TTS engines used: ${[...new Set(ttsEngines)].join(", ")}`);

    // ── Step 2: Compose final MP4 ──
    const musicCandidates = [
      path.join(process.cwd(), "public", "music", "background.mp3"),
      path.join(process.cwd(), "public", "music", "bg-music.mp3"),
    ];
    const musicPath = musicCandidates.find((p) => fs.existsSync(p));
    debug.push(`Music file: ${musicPath || "none (will generate ambient)"}`);

    const outputPath = path.join(tmpDir, "final-video.mp4");
    const composeResult = await composeVideo({
      scenes: jobs,
      musicPath,
      musicVolume: 0.12,
      outputPath,
    });

    debug.push(`Font used: ${composeResult.fontUsed}`);
    debug.push(`Music track: ${composeResult.hasMusicTrack}`);

    // ── Step 3: Upload to Supabase ──
    const finalBuffer = fs.readFileSync(composeResult.outputPath);
    debug.push(`Final video: ${finalBuffer.length} bytes`);

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
          adapted_script: { ...adaptedScript, videoSource: source },
          voice_settings: voiceSettings,
          status: "ready",
          final_video_url: urlData.publicUrl,
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
      videoSource: source,
      ttsAvailable,
      ttsEngines: [...new Set(ttsEngines)],
      fontUsed: composeResult.fontUsed,
      hasMusicTrack: composeResult.hasMusicTrack,
      debug,
      warning: !ttsAvailable
        ? "הסרטון נוצר ללא קריינות. הגדר ELEVEN_LABS_API_KEY ב-Vercel."
        : undefined,
    });
  } catch (error) {
    console.error("generate-all error:", error);
    debug.push(`ERROR: ${error instanceof Error ? error.message : "Unknown"}`);
    logApiCall({
      endpoint: "/api/video/generate-all",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown",
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate video",
        debug,
      },
      { status: 500 },
    );
  } finally {
    if (tmpDir) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
    }
  }
}
