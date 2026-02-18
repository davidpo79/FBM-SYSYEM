import { NextRequest, NextResponse } from "next/server";
import { searchVideos } from "@/lib/pexels";

/**
 * POST /api/video/search-clips
 * Body: { scenes: { number: number, searchQuery: string, duration: number }[] }
 * Returns: { scenes: { number: number, clips: PexelsVideo[] }[] }
 */
export async function POST(req: NextRequest) {
  try {
    const { scenes } = await req.json();

    if (!Array.isArray(scenes) || scenes.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid scenes array" },
        { status: 400 },
      );
    }

    // Search Pexels for each scene in parallel
    const results = await Promise.all(
      scenes.map(async (scene: { number: number; searchQuery: string; duration: number }) => {
        try {
          const clips = await searchVideos(
            scene.searchQuery,
            6,
            "landscape",
            Math.max(3, scene.duration - 3), // min duration slightly less than needed
          );
          return { number: scene.number, clips };
        } catch (err) {
          console.error(`search-clips: scene ${scene.number} failed:`, err);
          return { number: scene.number, clips: [] };
        }
      }),
    );

    return NextResponse.json({ scenes: results });
  } catch (error) {
    console.error("search-clips error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to search clips" },
      { status: 500 },
    );
  }
}
