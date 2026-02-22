import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getBestVideoFile } from "@/lib/pexels";
import { composeVideo } from "@/lib/video-compose";
import { generateTTS } from "@/lib/tts";
import { logApiCall } from "@/lib/api-log";
import type { AdaptedScript, VoiceSettings, PexelsVideo } from "@/lib/video-types";
import fs from "fs";
import path from "path";
import os from "os";

export const maxDuration = 300; // 5 minutes — Pexels download + TTS + compose

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
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let tmpDir = "";
  const debug: string[] = [];

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

    debug.push("Video source: pexels");

    // Check env vars
    debug.push(`GOOGLE_AI_API_KEY: ${process.env.GOOGLE_AI_API_KEY ? "SET" : "NOT SET"}`);
    debug.push(`GOOGLE_TTS_API_KEY: ${process.env.GOOGLE_TTS_API_KEY ? "SET" : "NOT SET"}`);
    debug.push(`PEXELS_API_KEY: ${process.env.PEXELS_API_KEY ? "SET" : "NOT SET"}`);

    // Validate scenes — every scene must have a selected clip
    const selectedScenes: SelectedScene[] = [];
    for (const scene of adaptedScript.scenes) {
      if (!scene.selectedClip) {
        return NextResponse.json(
          { error: `סצנה ${scene.number} חסר קליפ וידאו. בחר קליפ לכל סצנה.` },
          { status: 400 },
        );
      }
      selectedScenes.push({
        number: scene.number,
        duration: scene.duration,
        voiceOverText: scene.voiceOverText,
        selectedClip: scene.selectedClip,
      });
    }

    await ensureBucket();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fbm-pipeline-"));
    debug.push(`tmpDir: ${tmpDir}`);

    // ── Step 1: Download Pexels clips in parallel ──
    const ttsEngines: string[] = [];
    let ttsAvailable = true;
    let ttsFailureReason = "";

    const videoPaths = await Promise.all(
      selectedScenes.map(async (scene, i) => {
        const clipUrl = getBestVideoFile(scene.selectedClip!);
        if (!clipUrl) throw new Error(`סצנה ${scene.number}: לא נמצא קובץ וידאו`);
        const videoPath = path.join(tmpDir, `clip-${i}.mp4`);
        await downloadFile(clipUrl, videoPath);
        return videoPath;
      }),
    );

    // ── Step 2: Generate TTS for each scene ──
    const jobs: { videoPath: string; audioPath: string; subtitleText: string; duration: number }[] = [];

    for (let i = 0; i < selectedScenes.length; i++) {
      const scene = selectedScenes[i];

      const ttsResult = await generateTTS(
        scene.voiceOverText,
        voiceSettings.voice,
        voiceSettings.rate,
        voiceSettings.pitch,
        scene.duration,
      );

      ttsEngines.push(ttsResult.engine);
      if (!ttsResult.usedTTS) {
        ttsAvailable = false;
        if (ttsResult.failureReason) ttsFailureReason = ttsResult.failureReason;
      }

      const audioPath = path.join(tmpDir, `vo-${i}.wav`);
      fs.writeFileSync(audioPath, ttsResult.audioBuffer);
      debug.push(`Scene ${i + 1}: TTS=${ttsResult.engine}, audio=${ttsResult.audioBuffer.length}b`);

      jobs.push({
        videoPath: videoPaths[i],
        audioPath,
        subtitleText: scene.voiceOverText,
        duration: scene.duration,
      });
    }

    debug.push(`TTS engines used: ${[...new Set(ttsEngines)].join(", ")}`);

    // ── Step 3: Compose final MP4 (video + audio + subtitles + music) ──
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

    // ── Step 4: Upload to Supabase ──
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
          adapted_script: { ...adaptedScript, videoSource: "pexels" },
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
      videoSource: "pexels",
      ttsAvailable,
      ttsEngines: [...new Set(ttsEngines)],
      fontUsed: composeResult.fontUsed,
      hasMusicTrack: composeResult.hasMusicTrack,
      debug,
      warning: !ttsAvailable
        ? ttsFailureReason || "הסרטון נוצר ללא קריינות. בדוק GOOGLE_AI_API_KEY בהגדרות Vercel."
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
