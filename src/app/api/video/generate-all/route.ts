import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getBestVideoFile } from "@/lib/pexels";
import { composeVideo } from "@/lib/video-compose";
import { generateTTS, generateTTSWithTimestamps } from "@/lib/tts";
import { startVideoGeneration, pollVideoOperation, downloadVeoVideo, generateImageClip } from "@/lib/veo";
import { logApiCall } from "@/lib/api-log";
import type { AdaptedScript, VoiceSettings, PexelsVideo, VideoSource } from "@/lib/video-types";
import fs from "fs";
import path from "path";
import os from "os";

export const maxDuration = 600; // 10 minutes — Veo needs ~35s delay between scenes

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
    debug.push(`GOOGLE_AI_API_KEY: ${process.env.GOOGLE_AI_API_KEY ? "SET" : "NOT SET"}`);
    debug.push(`GOOGLE_TTS_API_KEY: ${process.env.GOOGLE_TTS_API_KEY ? "SET" : "NOT SET"}`);
    debug.push(`PEXELS_API_KEY: ${process.env.PEXELS_API_KEY ? "SET" : "NOT SET"}`);

    // Validate scenes based on source
    const selectedScenes: SelectedScene[] = [];
    for (const scene of adaptedScript.scenes) {
      if (source === "pexels" && !scene.selectedClip) {
        return NextResponse.json(
          { error: `סצנה ${scene.number} חסר קליפ וידאו. בחר קליפ לכל סצנה.` },
          { status: 400 },
        );
      }
      if (source === "veo" && !scene.videoPromptEn && !scene.aiClipUrl) {
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

    // ── Step 1a: Download/generate video clips ──
    const ttsEngines: string[] = [];
    let ttsAvailable = true;
    let ttsFailureReason = "";
    const useTimestamps = source === "veo"; // Use word-level sync for AI clips

    const videoPaths: string[] = [];

    if (source === "pexels") {
      // Pexels: download all clips in parallel (no rate limits)
      const paths = await Promise.all(
        selectedScenes.map(async (scene, i) => {
          const clipUrl = getBestVideoFile(scene.selectedClip!);
          if (!clipUrl) throw new Error(`סצנה ${scene.number}: לא נמצא קובץ וידאו`);
          const videoPath = path.join(tmpDir, `clip-${i}.mp4`);
          await downloadFile(clipUrl, videoPath);
          return videoPath;
        }),
      );
      videoPaths.push(...paths);
    } else {
      // Veo: generate clips SEQUENTIALLY with delay to avoid rate limits (2 req/min)
      let veoFailed = false; // once Veo rate-limits, use Imagen for rest
      for (let i = 0; i < selectedScenes.length; i++) {
        const scene = selectedScenes[i];
        let videoPath: string;

        if (scene.aiClipUrl) {
          debug.push(`Scene ${i + 1}: Using pre-generated AI clip`);
          videoPath = path.join(tmpDir, `clip-${i}.mp4`);
          await downloadFile(scene.aiClipUrl, videoPath);
        } else if (veoFailed) {
          // Veo rate limited — use Imagen + Ken Burns fallback
          debug.push(`Scene ${i + 1}: Using Imagen fallback (Ken Burns)...`);
          try {
            videoPath = await generateImageClip(scene.videoPromptEn || "", scene.duration, "9:16");
            debug.push(`Scene ${i + 1}: Imagen clip ready`);
          } catch (imgErr) {
            debug.push(`Scene ${i + 1}: Imagen failed: ${imgErr instanceof Error ? imgErr.message : "Unknown"}`);
            throw new Error(`סצנה ${i + 1}: ייצור קליפ נכשל (Veo rate-limited + Imagen failed)`);
          }
        } else {
          // Try Veo with rate-limit handling
          try {
            debug.push(`Scene ${i + 1}: Generating AI clip with Veo...`);
            const prompt = scene.videoPromptEn || "";

            // Wait 35s between Veo requests (2 req/min limit)
            if (i > 0) {
              debug.push(`Scene ${i + 1}: Waiting 35s for Veo rate limit...`);
              await new Promise((r) => setTimeout(r, 35000));
            }

            const operation = await startVideoGeneration(prompt, "9:16");

            // Poll until done (max 5 min per clip)
            const maxWait = 300000;
            const pollInterval = 10000;
            const startPoll = Date.now();
            let finalOp = operation;
            let pollDone = false;

            while (Date.now() - startPoll < maxWait) {
              const pollResult = await pollVideoOperation(finalOp);
              if (pollResult.done) {
                if (pollResult.error) {
                  throw new Error(pollResult.error);
                }
                finalOp = pollResult.operation;
                pollDone = true;
                break;
              }
              finalOp = pollResult.operation;
              debug.push(`Scene ${i + 1}: Veo generating... (${Math.round((Date.now() - startPoll) / 1000)}s)`);
              await new Promise((r) => setTimeout(r, pollInterval));
            }

            if (!pollDone) {
              throw new Error("Timeout");
            }

            videoPath = await downloadVeoVideo(finalOp);
            debug.push(`Scene ${i + 1}: AI clip ready`);
          } catch (veoErr) {
            const errMsg = veoErr instanceof Error ? veoErr.message : String(veoErr);
            debug.push(`Scene ${i + 1}: Veo failed: ${errMsg}`);

            // If rate limited or any Veo error, switch to Imagen fallback for remaining scenes
            veoFailed = true;
            debug.push(`Scene ${i + 1}: Switching to Imagen fallback for remaining scenes`);

            try {
              videoPath = await generateImageClip(scene.videoPromptEn || "", scene.duration, "9:16");
              debug.push(`Scene ${i + 1}: Imagen clip ready`);
            } catch (imgErr) {
              debug.push(`Scene ${i + 1}: Imagen also failed: ${imgErr instanceof Error ? imgErr.message : "Unknown"}`);
              throw new Error(`סצנה ${i + 1}: ייצור קליפ נכשל. ${errMsg}`);
            }
          }
        }

        videoPaths.push(videoPath!);
      }
    }

    // ── Step 1b: Generate TTS sequentially ──
    const jobs: { videoPath: string; audioPath: string; subtitleText: string; duration: number }[] = [];

    for (let i = 0; i < selectedScenes.length; i++) {
      const scene = selectedScenes[i];

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
      if (!ttsResult.usedTTS) {
        ttsAvailable = false;
        if (ttsResult.failureReason) ttsFailureReason = ttsResult.failureReason;
      }

      const audioPath = path.join(tmpDir, `vo-${i}.wav`);
      fs.writeFileSync(audioPath, ttsResult.audioBuffer);
      debug.push(`Scene ${i + 1}: TTS=${ttsResult.engine}, audio=${ttsResult.audioBuffer.length}b${ttsResult.wordTimestamps ? `, words=${ttsResult.wordTimestamps.length}` : ""}`);

      jobs.push({
        videoPath: videoPaths[i],
        audioPath,
        subtitleText: scene.voiceOverText,
        duration: scene.duration,
      });
    }

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
