import type { PexelsVideo } from "./video-types";

const PEXELS_BASE = "https://api.pexels.com/videos/search";

/**
 * Search Pexels for stock video clips.
 * Requires PEXELS_API_KEY environment variable (free at pexels.com/api).
 */
export async function searchVideos(
  query: string,
  perPage = 6,
  orientation: "landscape" | "portrait" | "square" = "portrait",
  minDuration = 5,
): Promise<PexelsVideo[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    throw new Error("PEXELS_API_KEY is not configured. Get a free key at pexels.com/api");
  }

  const params = new URLSearchParams({
    query,
    per_page: String(perPage),
    orientation,
  });

  const res = await fetch(`${PEXELS_BASE}?${params}`, {
    headers: { Authorization: apiKey },
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("Pexels rate limit reached. Try again in a minute.");
    }
    throw new Error(`Pexels API error: ${res.status}`);
  }

  const data = await res.json();

  return (data.videos || [])
    .filter((v: Record<string, unknown>) => (v.duration as number) >= minDuration)
    .map((v: Record<string, unknown>) => ({
      id: v.id as number,
      url: v.url as string,
      image: v.image as string,
      duration: v.duration as number,
      videoFiles: (
        (v.video_files as Array<Record<string, unknown>>) || []
      ).map((f) => ({
        id: f.id as number,
        quality: f.quality as string,
        width: f.width as number,
        height: f.height as number,
        link: f.link as string,
      })),
    }));
}

/**
 * Pick the best video file URL from a PexelsVideo.
 * Prefers HD ≤ 1920px width, then falls back to largest available.
 */
export function getBestVideoFile(video: PexelsVideo): string | null {
  if (!video.videoFiles.length) return null;

  const sorted = [...video.videoFiles].sort((a, b) => {
    if (a.quality === "hd" && b.quality !== "hd") return -1;
    if (b.quality === "hd" && a.quality !== "hd") return 1;
    return b.width - a.width;
  });

  // Prefer HD ≤ 1920px for reasonable file size
  const hd = sorted.find((f) => f.quality === "hd" && f.width <= 1920);
  if (hd) return hd.link;

  return sorted[0]?.link || null;
}
