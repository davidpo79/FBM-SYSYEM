import { NextRequest, NextResponse } from "next/server";
import { pollVideoOperation, downloadVeoVideo } from "@/lib/veo";
import { supabaseAdmin } from "@/lib/supabase-admin";
import fs from "fs";
import path from "path";

/**
 * POST /api/video/check-scenes
 *
 * Polls Veo operations for all scenes. When a clip is done,
 * downloads it and uploads to Supabase storage.
 *
 * Input: { projectId, scriptIndex, scenes: [{ sceneNumber, operationName }] }
 * Output: { scenes: [{ sceneNumber, status, videoUrl? }], allDone }
 */
export async function POST(req: NextRequest) {
  try {
    const { projectId, scriptIndex, scenes } = await req.json();

    if (!projectId || !scenes || !Array.isArray(scenes)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const results = [];
    let allDone = true;

    for (const scene of scenes) {
      const { sceneNumber, operationName } = scene;

      // If already has a videoUrl, skip polling
      if (scene.videoUrl) {
        results.push({
          sceneNumber,
          status: "done" as const,
          videoUrl: scene.videoUrl,
        });
        continue;
      }

      // Poll Veo operation by name
      const pollResult = await pollVideoOperation(operationName);

      if (pollResult.done && !pollResult.error) {
        // Download clip and upload to Supabase
        try {
          const clipPath = await downloadVeoVideo(pollResult.operation);
          const videoBuffer = fs.readFileSync(clipPath);
          // Clean up Veo download temp dir
          try { fs.rmSync(path.dirname(clipPath), { recursive: true, force: true }); } catch {}

          const storagePath = `${projectId}/script-${scriptIndex}/scene-${sceneNumber}-clip.mp4`;

          const { error: uploadErr } = await supabaseAdmin.storage
            .from("videos")
            .upload(storagePath, videoBuffer, {
              contentType: "video/mp4",
              upsert: true,
            });

          if (uploadErr) {
            console.error(`Upload error scene ${sceneNumber}:`, uploadErr);
            results.push({
              sceneNumber,
              status: "error" as const,
              error: "Upload failed",
            });
            continue;
          }

          const { data: urlData } = supabaseAdmin.storage
            .from("videos")
            .getPublicUrl(storagePath);

          results.push({
            sceneNumber,
            status: "done" as const,
            videoUrl: urlData.publicUrl,
          });
        } catch (dlError) {
          console.error(`Download error scene ${sceneNumber}:`, dlError);
          results.push({
            sceneNumber,
            status: "error" as const,
            error: dlError instanceof Error ? dlError.message : "Download failed",
          });
        }
      } else if (pollResult.done && pollResult.error) {
        results.push({
          sceneNumber,
          status: "error" as const,
          error: pollResult.error,
        });
      } else {
        allDone = false;
        results.push({
          sceneNumber,
          status: "generating" as const,
        });
      }
    }

    return NextResponse.json({ scenes: results, allDone });
  } catch (error) {
    console.error("check-scenes error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check scenes" },
      { status: 500 },
    );
  }
}
