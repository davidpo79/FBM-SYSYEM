import { NextRequest, NextResponse } from "next/server";
import { startRunwayGeneration, pollRunwayTask } from "@/lib/runway";
import { logApiCall } from "@/lib/api-log";

export const maxDuration = 300; // 5 minutes for video generation

/**
 * POST /api/video/generate-ai-clip
 *
 * Starts Runway Gen-3 video generation for a single scene.
 * Returns immediately with a task ID for polling.
 *
 * Body: { prompt: string, sceneNumber: number, duration?: 5|10 }
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { prompt, sceneNumber, duration } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Missing prompt" },
        { status: 400 },
      );
    }

    if (!process.env.RUNWAY_API_KEY) {
      return NextResponse.json(
        { error: "RUNWAY_API_KEY לא הוגדר. הוסף אותו בהגדרות Vercel." },
        { status: 500 },
      );
    }

    // Start async Runway generation (9:16 portrait for Reels/TikTok)
    const taskId = await startRunwayGeneration(
      prompt,
      "9:16",
      duration || 5,
    );

    logApiCall({
      endpoint: "/api/video/generate-ai-clip",
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({
      taskId,
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
 * Poll Runway task status. Returns status and video URL when ready.
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

    const result = await pollRunwayTask(taskId);

    return NextResponse.json({
      taskId,
      status: result.status,
      videoUrl: result.output?.[0] || null,
      error: result.failure || null,
    });
  } catch (error) {
    console.error("poll-ai-clip error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to poll task" },
      { status: 500 },
    );
  }
}
