import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { startVideoGeneration, pollVideoOperation, downloadVeoVideo, generateImageClip } from "@/lib/veo";
import { composeVideo } from "@/lib/video-compose";
import { generateTTS } from "@/lib/tts";
import { logApiCall } from "@/lib/api-log";
import type { AdaptedScript, VoiceSettings } from "@/lib/video-types";
import fs from "fs";
import path from "path";
import os from "os";

// Allow up to 5 minutes for the full pipeline
export const maxDuration = 300;

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

    // ── Step 1 + 2: Start Veo (staggered) + TTS (parallel) ──
    // Veo rate limit: 2 RPM. Send in batches of 2 with 62s delay between batches.
    let ttsAvailable = true;
    const VEO_BATCH_SIZE = 2;
    const VEO_BATCH_DELAY_MS = 62000; // 62 seconds to respect 2 RPM

    type SceneJob = {
      sceneNumber: number;
      operation: Awaited<ReturnType<typeof startVideoGeneration>>;
      audioPath: string;
      scene: (typeof adaptedScript.scenes)[number];
    };
    const jobs: SceneJob[] = [];

    // Generate TTS for all scenes immediately (no Veo rate limit)
    const ttsJobs = adaptedScript.scenes.map(async (scene, i) => {
      const ttsResult = await generateTTS(
        scene.voiceOverText,
        voiceSettings.voice,
        voiceSettings.rate,
        voiceSettings.pitch,
        scene.duration,
      );
      if (!ttsResult.usedTTS) ttsAvailable = false;
      const audioPath = path.join(tmpDir, `vo-${i}.mp3`);
      fs.writeFileSync(audioPath, ttsResult.audioBuffer);
      return { audioPath, scene };
    });

    const ttsResults = await Promise.all(ttsJobs);

    // ── Try Veo first, fallback to Imagen + Ken Burns ──
    let useVeo = true;
    const videoFiles: Record<number, string> = {};

    // Try starting first Veo request to test if we have quota
    try {
      const testScene = adaptedScript.scenes[0];
      const testPrompt = `Create a professional cinematic B-Roll video clip. SCENE: ${testScene.imagePrompt} STYLE: Photorealistic, cinematic lighting, smooth camera movement, no text.`;
      const testOp = await startVideoGeneration(testPrompt, "16:9");
      jobs.push({
        sceneNumber: testScene.number,
        operation: testOp,
        audioPath: ttsResults[0].audioPath,
        scene: testScene,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("חריגה")) {
        console.warn("Veo rate limited — switching to Imagen + Ken Burns fallback");
        useVeo = false;
      } else {
        throw e;
      }
    }

    if (useVeo) {
      // Continue with Veo: start remaining scenes in batches (scene 0 already started)
      for (let batchStart = 1; batchStart < adaptedScript.scenes.length; batchStart += VEO_BATCH_SIZE) {
        // Wait between batches for RPM limit
        console.log(`Waiting ${VEO_BATCH_DELAY_MS / 1000}s before next Veo batch (RPM limit)...`);
        await new Promise((r) => setTimeout(r, VEO_BATCH_DELAY_MS));

        const batchEnd = Math.min(batchStart + VEO_BATCH_SIZE, adaptedScript.scenes.length);
        const batchPromises = [];

        for (let i = batchStart; i < batchEnd; i++) {
          const scene = adaptedScript.scenes[i];
          const veoPrompt = `Create a professional cinematic B-Roll video clip. SCENE: ${scene.imagePrompt} STYLE: Photorealistic, cinematic lighting, smooth camera movement, no text.`;

          batchPromises.push(
            startVideoGeneration(veoPrompt, "16:9")
              .then((operation) => ({
                sceneNumber: scene.number,
                operation,
                audioPath: ttsResults[i].audioPath,
                scene,
              })),
          );
        }

        try {
          const batchResults = await Promise.all(batchPromises);
          jobs.push(...batchResults);
        } catch (e) {
          // Rate limited mid-batch: remaining scenes will use Imagen fallback
          const msg = e instanceof Error ? e.message : "";
          if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("חריגה")) {
            console.warn(`Veo rate limited at batch ${batchStart}. Remaining scenes will use Imagen.`);
            break;
          }
          throw e;
        }
      }

      // Poll Veo operations
      const MAX_POLL_TIME = 240000;
      const POLL_INTERVAL = 10000;
      const pollStart = Date.now();
      const failedScenes: Record<number, string> = {};

      while (
        Object.keys(videoFiles).length + Object.keys(failedScenes).length < jobs.length
      ) {
        if (Date.now() - pollStart > MAX_POLL_TIME) {
          console.error("Veo polling timed out.");
          for (const job of jobs) {
            if (!videoFiles[job.sceneNumber] && !failedScenes[job.sceneNumber]) {
              failedScenes[job.sceneNumber] = "timeout";
            }
          }
          break;
        }

        await new Promise((r) => setTimeout(r, POLL_INTERVAL));

        for (const job of jobs) {
          if (videoFiles[job.sceneNumber] || failedScenes[job.sceneNumber]) continue;

          const result = await pollVideoOperation(job.operation);

          if (result.done && !result.error) {
            try {
              const clipPath = await downloadVeoVideo(result.operation);
              const videoPath = path.join(tmpDir, `clip-${job.sceneNumber}.mp4`);
              fs.copyFileSync(clipPath, videoPath);
              videoFiles[job.sceneNumber] = videoPath;
              try { fs.rmSync(path.dirname(clipPath), { recursive: true, force: true }); } catch {}
            } catch (dlErr) {
              failedScenes[job.sceneNumber] = dlErr instanceof Error ? dlErr.message : "Download failed";
            }
          } else if (result.done && result.error) {
            failedScenes[job.sceneNumber] = result.error;
          }
        }
      }

      // Use Imagen fallback for any failed Veo scenes
      for (const [sceneNumStr, err] of Object.entries(failedScenes)) {
        const sceneNum = Number(sceneNumStr);
        const scene = adaptedScript.scenes.find((s) => s.number === sceneNum);
        if (!scene) continue;
        console.warn(`Scene ${sceneNum} Veo failed (${err}), using Imagen fallback`);
        try {
          const clipPath = await generateImageClip(scene.imagePrompt, scene.duration, "16:9");
          const videoPath = path.join(tmpDir, `clip-${sceneNum}.mp4`);
          fs.copyFileSync(clipPath, videoPath);
          videoFiles[sceneNum] = videoPath;
          try { fs.rmSync(path.dirname(clipPath), { recursive: true, force: true }); } catch {}
        } catch (imgErr) {
          console.error(`Scene ${sceneNum} Imagen fallback also failed:`, imgErr);
        }
      }
    }

    // Imagen-only path (Veo completely rate-limited)
    if (!useVeo) {
      console.log("Using Imagen + Ken Burns for all scenes (Veo unavailable)");
      const imagenJobs = adaptedScript.scenes.map(async (scene, i) => {
        const clipPath = await generateImageClip(scene.imagePrompt, scene.duration, "16:9");
        const videoPath = path.join(tmpDir, `clip-${scene.number}.mp4`);
        fs.copyFileSync(clipPath, videoPath);
        videoFiles[scene.number] = videoPath;
        try { fs.rmSync(path.dirname(clipPath), { recursive: true, force: true }); } catch {}

        jobs.push({
          sceneNumber: scene.number,
          operation: null as unknown as Awaited<ReturnType<typeof startVideoGeneration>>,
          audioPath: ttsResults[i].audioPath,
          scene,
        });
      });
      await Promise.all(imagenJobs);
    }

    // If still no clips, throw
    if (Object.keys(videoFiles).length === 0) {
      throw new Error("כל הסצנות נכשלו ביצירת וידאו. נסה שוב מאוחר יותר.");
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
      ttsAvailable,
      warning: !ttsAvailable
        ? "הסרטון נוצר ללא קריינות. יש להגדיר GOOGLE_TTS_API_KEY ולהפעיל את Cloud Text-to-Speech API."
        : undefined,
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
