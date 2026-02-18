import { NextRequest, NextResponse } from "next/server";
import { startVideoGeneration, pollVideoOperation } from "@/lib/veo";
import { logApiCall } from "@/lib/api-log";

export const maxDuration = 300; // 5 minutes for video generation

/**
 * POST /api/video/generate-ai-clip
 *
 * Starts Google Veo video generation for a single scene.
 * Returns immediately with an operation name for polling.
 *
 * Body: { prompt: string, sceneNumber: number }
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { prompt, sceneNumber } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Missing prompt" },
        { status: 400 },
      );
    }

    if (!process.env.GOOGLE_AI_API_KEY) {
      return NextResponse.json(
        { error: "GOOGLE_AI_API_KEY לא הוגדר. הוסף אותו בהגדרות Vercel." },
        { status: 500 },
      );
    }

    // Start async Veo generation (9:16 portrait for Reels/TikTok)
    const operation = await startVideoGeneration(prompt, "9:16");

    logApiCall({
      endpoint: "/api/video/generate-ai-clip",
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({
      taskId: operation.name,
      sceneNumber,
      status: "generating",
    });
  } catch (error) {
    console.error("generate-ai-clip error:", error);
    logApiCall({
      endpoint: "/api/video/generate-ai-clip",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown",
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start AI clip generation" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/video/generate-ai-clip?taskId=xxx
 *
 * Poll Veo operation status. Returns status and video URL when ready.
 */
export async function GET(req: NextRequest) {
  try {
    const taskId = req.nextUrl.searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json(
        { error: "Missing taskId parameter" },
        { status: 400 },
      );
    }

    const result = await pollVideoOperation(taskId);

    if (result.done) {
      if (result.error) {
        return NextResponse.json({
          taskId,
          status: "FAILED",
          videoUrl: null,
          error: result.error,
        });
      }

      // Get the video URL from the operation result
      const videoUri = result.operation.response?.generatedVideos?.[0]?.video?.uri;
      return NextResponse.json({
        taskId,
        status: "SUCCEEDED",
        videoUrl: videoUri || null,
        error: null,
      });
    }

    return NextResponse.json({
      taskId,
      status: "RUNNING",
      videoUrl: null,
      error: null,
    });
  } catch (error) {
    console.error("poll-ai-clip error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to poll task" },
      { status: 500 },
    );
  }
}
