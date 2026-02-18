/**
 * Runway API integration for AI-generated video clips.
 *
 * Generates cinematic B-Roll clips using text prompts.
 * Async workflow: submit → poll → download.
 *
 * Text-to-video: veo3.1, veo3.1_fast, veo3 (text prompt only)
 * Image-to-video: gen4_turbo, gen3a_turbo (requires source image)
 *
 * Requires: RUNWAY_API_KEY environment variable.
 */

const RUNWAY_API_BASE = "https://api.dev.runwayml.com/v1";

// Text-to-video models (no image required) — ordered by priority
const TEXT_TO_VIDEO_MODELS = [
  {
    model: "veo3.1_fast",
    portraitRatio: "720:1280",
    landscapeRatio: "1280:720",
    // veo text-to-video supports 4, 6, or 8 seconds only
    maxDuration: 8,
  },
  {
    model: "veo3.1",
    portraitRatio: "720:1280",
    landscapeRatio: "1280:720",
    maxDuration: 8,
  },
  {
    model: "veo3",
    portraitRatio: "720:1280",
    landscapeRatio: "1280:720",
    maxDuration: 8,
  },
] as const;

export interface RunwayTaskResult {
  id: string;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "THROTTLED";
  output?: string[];       // Video URLs when SUCCEEDED
  failure?: string;
  failureCode?: string;
  createdAt?: string;
}

function getApiKey(): string {
  const key = process.env.RUNWAY_API_KEY;
  if (!key) {
    throw new Error("RUNWAY_API_KEY לא הוגדר. הוסף אותו בהגדרות Vercel.");
  }
  return key;
}

function getHeaders(): Record<string, string> {
  return {
    "Authorization": `Bearer ${getApiKey()}`,
    "X-Runway-Version": "2024-11-06",
    "Content-Type": "application/json",
  };
}

/**
 * Clamp duration to allowed values for text-to-video (4, 6, or 8 seconds).
 */
function clampTextToVideoDuration(requested: number, max: number): number {
  const allowed = [4, 6, 8].filter((d) => d <= max);
  // Pick the closest allowed duration
  let best = allowed[0];
  for (const d of allowed) {
    if (Math.abs(d - requested) < Math.abs(best - requested)) {
      best = d;
    }
  }
  return best;
}

/**
 * Start generating a video clip with Runway text-to-video.
 * Tries veo3.1_fast → veo3.1 → veo3 until one succeeds.
 * Returns a task ID to poll for completion.
 *
 * @param prompt - English cinematic description
 * @param aspectRatio - "16:9" (landscape) or "9:16" (portrait)
 * @param duration - requested seconds (will be clamped to 4/6/8)
 */
export async function startRunwayGeneration(
  prompt: string,
  aspectRatio: "16:9" | "9:16" = "9:16",
  duration: 5 | 10 = 5,
): Promise<string> {
  console.log(`Runway: Starting text_to_video (${duration}s, ${aspectRatio})...`);
  console.log(`Runway prompt: ${prompt.substring(0, 100)}...`);

  const url = `${RUNWAY_API_BASE}/text_to_video`;
  const errors: string[] = [];

  for (const config of TEXT_TO_VIDEO_MODELS) {
    const ratio = aspectRatio === "9:16" ? config.portraitRatio : config.landscapeRatio;
    const actualDuration = clampTextToVideoDuration(duration, config.maxDuration);

    const payload = {
      model: config.model,
      promptText: prompt,
      ratio,
      duration: actualDuration,
    };

    console.log(`Runway: Trying ${config.model} (${actualDuration}s, ${ratio})...`);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.id) {
          console.log(`Runway: ${config.model} → Task started: ${data.id}`);
          return data.id;
        }
        console.warn(`Runway: ${config.model} returned OK but no task ID`);
        errors.push(`${config.model}: no task ID`);
        continue;
      }

      const errText = await response.text().catch(() => "");
      console.warn(`Runway: ${config.model} failed [${response.status}]: ${errText.substring(0, 200)}`);

      // Rate limit — stop immediately
      if (response.status === 429) {
        throw new Error("Runway: חריגה ממגבלת בקשות. נסה שוב בעוד דקה.");
      }

      // Auth error — key is invalid, stop immediately
      if (response.status === 401) {
        throw new Error(`Runway: מפתח API לא תקין (401). בדוק RUNWAY_API_KEY. ${errText.substring(0, 200)}`);
      }

      // 403/422 = model not available for this account, try next
      errors.push(`${config.model}: [${response.status}] ${errText.substring(0, 100)}`);
    } catch (e) {
      if (e instanceof Error && (e.message.includes("429") || e.message.includes("401"))) {
        throw e;
      }
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`Runway: ${config.model} error: ${msg}`);
      errors.push(`${config.model}: ${msg.substring(0, 100)}`);
    }
  }

  throw new Error(
    `Runway: אף מודל text-to-video לא זמין. ` +
      `נסה לבדוק את תוכנית ה-API שלך ב-Runway (נדרש גישה ל-veo3.1 / veo3). ` +
      `ניסיונות: ${errors.join(" | ")}`,
  );
}

/**
 * Poll a Runway task until it completes.
 * Returns the task status and output URLs.
 */
export async function pollRunwayTask(taskId: string): Promise<RunwayTaskResult> {
  const url = `${RUNWAY_API_BASE}/tasks/${taskId}`;

  const response = await fetch(url, {
    method: "GET",
    headers: getHeaders(),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Runway poll error [${response.status}]: ${errText}`);
  }

  const data: RunwayTaskResult = await response.json();
  return data;
}

/**
 * Wait for a Runway task to complete, polling every interval.
 * Returns the video URL when done.
 *
 * @param taskId - Task ID from startRunwayGeneration
 * @param pollIntervalMs - Polling interval (default 10s)
 * @param maxWaitMs - Maximum wait time (default 5 min)
 */
export async function waitForRunwayVideo(
  taskId: string,
  pollIntervalMs = 10000,
  maxWaitMs = 300000,
): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const result = await pollRunwayTask(taskId);

    switch (result.status) {
      case "SUCCEEDED":
        if (result.output && result.output.length > 0) {
          console.log(`Runway: Video ready! URL: ${result.output[0].substring(0, 80)}...`);
          return result.output[0];
        }
        throw new Error("Runway: Task succeeded but no output URL");

      case "FAILED":
        throw new Error(`Runway generation failed: ${result.failure || result.failureCode || "Unknown error"}`);

      case "THROTTLED":
        console.log("Runway: Task throttled, waiting...");
        break;

      case "PENDING":
      case "RUNNING":
        console.log(`Runway: Task ${result.status}... (${Math.round((Date.now() - startTime) / 1000)}s)`);
        break;
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error("Runway: Timeout - video generation took too long");
}

/**
 * Generate a cinematic video clip prompt from a scene description.
 * Adds cinematic keywords for high-quality output.
 */
export function buildCinematicPrompt(
  visualDescription: string,
  style: "cinematic" | "documentary" | "energetic" = "cinematic",
): string {
  const styleMap = {
    cinematic: "Cinematic 35mm lens, f/1.8, shallow depth of field, volumetric lighting, shot on Arri Alexa, high-end color grading, professional film look",
    documentary: "Documentary style, natural lighting, handheld camera feel, authentic look, subtle color grading",
    energetic: "Dynamic camera movement, fast-paced editing feel, vibrant colors, high contrast, energetic mood, motion blur",
  };

  return `${visualDescription}. ${styleMap[style]}, highly detailed, photorealistic, 8K quality.`;
}

/**
 * Full flow: generate a Runway video clip and return the download URL.
 * Combines start + wait in one call.
 */
export async function generateRunwayClip(
  prompt: string,
  options?: {
    aspectRatio?: "16:9" | "9:16";
    duration?: 5 | 10;
    style?: "cinematic" | "documentary" | "energetic";
  },
): Promise<string> {
  const {
    aspectRatio = "9:16",
    duration = 5,
    style = "cinematic",
  } = options || {};

  const cinematicPrompt = buildCinematicPrompt(prompt, style);
  const taskId = await startRunwayGeneration(cinematicPrompt, aspectRatio, duration);
  const videoUrl = await waitForRunwayVideo(taskId);

  return videoUrl;
}
