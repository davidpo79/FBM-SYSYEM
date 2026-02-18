import { NextRequest, NextResponse } from "next/server";
import { composeVideo, cleanupTempDir } from "@/lib/video-compose";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logApiCall } from "@/lib/api-log";
import fs from "fs";
import path from "path";
import os from "os";

// Allow up to 5 minutes for video composition
export const maxDuration = 300;

/**
 * POST /api/video/compose
 *
 * Downloads all Veo clips + TTS audio, composes into final MP4
 * with subtitles and background music, uploads to Supabase.
 *
 * Input: {
 *   projectId, scriptIndex,
 *   scenes: [{ videoUrl, ttsUrl, subtitleText, duration }]
 * }
 * Output: { videoUrl }
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let tmpDir = "";

  try {
    const { projectId, scriptIndex, scenes } = await req.json();

    if (!projectId || !scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Create temp directory for all files
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fbm-compose-"));

    // Download all video clips and audio files
    const composeScenes = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const videoPath = path.join(tmpDir, `clip-${i}.mp4`);
      const audioPath = path.join(tmpDir, `vo-${i}.mp3`);

      // Download video clip
      const videoRes = await fetch(scene.videoUrl);
      if (!videoRes.ok) throw new Error(`Failed to download clip ${i}: ${videoRes.status}`);
      const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
      fs.writeFileSync(videoPath, videoBuffer);

      // Download TTS audio
      const audioRes = await fetch(scene.ttsUrl);
      if (!audioRes.ok) throw new Error(`Failed to download audio ${i}: ${audioRes.status}`);
      const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
      fs.writeFileSync(audioPath, audioBuffer);

      composeScenes.push({
        videoPath,
        audioPath,
        subtitleText: scene.subtitleText || "",
        duration: scene.duration || 12,
      });
    }

    // Check for background music file
    const musicCandidates = [
      path.join(process.cwd(), "public", "music", "background.mp3"),
      path.join(process.cwd(), "public", "music", "bg-music.mp3"),
    ];
    const musicPath = musicCandidates.find((p) => fs.existsSync(p));

    // Compose final video
    const outputPath = path.join(tmpDir, "final-video.mp4");
    await composeVideo({
      scenes: composeScenes,
      musicPath,
      musicVolume: 0.12,
      outputPath,
    });

    // Read the final video
    const finalVideoBuffer = fs.readFileSync(outputPath);

    // Upload to Supabase storage
    const storagePath = `${projectId}/script-${scriptIndex}/final-video.mp4`;

    // Ensure bucket exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    if (!buckets?.find((b) => b.name === "videos")) {
      await supabaseAdmin.storage.createBucket("videos", {
        public: true,
        fileSizeLimit: 104857600,
      });
    }

    const { error: uploadErr } = await supabaseAdmin.storage
      .from("videos")
      .upload(storagePath, finalVideoBuffer, {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadErr) {
      throw new Error(`Upload failed: ${uploadErr.message}`);
    }

    const { data: urlData } = supabaseAdmin.storage
      .from("videos")
      .getPublicUrl(storagePath);

    // Update video_projects record
    await supabaseAdmin
      .from("video_projects")
      .upsert(
        {
          project_id: projectId,
          script_index: scriptIndex ?? 0,
          status: "ready",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "project_id,script_index" },
      );

    logApiCall({
      endpoint: "/api/video/compose",
      projectId,
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ videoUrl: urlData.publicUrl });
  } catch (error) {
    console.error("compose error:", error);
    logApiCall({
      endpoint: "/api/video/compose",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown",
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to compose video" },
      { status: 500 },
    );
  } finally {
    // Cleanup temp files
    if (tmpDir) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {}
    }
  }
}
