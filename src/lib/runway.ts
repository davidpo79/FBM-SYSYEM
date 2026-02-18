/**
 * Runway Gen-3 Alpha API integration for AI-generated video clips.
 *
 * Generates cinematic B-Roll clips using text prompts.
 * Async workflow: submit → poll → download.
 *
 * Requires: RUNWAY_API_KEY environment variable.
 */

const RUNWAY_API_BASE = "https://api.dev.runwayml.com/v1";

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
 * Start generating a video clip with Runway Gen-3 Alpha Turbo.
 * Returns a task ID to poll for completion.
 *
 * @param prompt - English cinematic description
 * @param aspectRatio - "16:9" (landscape) or "9:16" (portrait)
 * @param duration - 5 or 10 seconds
 */
export async function startRunwayGeneration(
  prompt: string,
  aspectRatio: "16:9" | "9:16" = "9:16",
  duration: 5 | 10 = 5,
): Promise<string> {
  const url = `${RUNWAY_API_BASE}/text_to_video`;

  const payload = {
    model: "gen3a_turbo",
    promptText: prompt,
    ratio: aspectRatio === "9:16" ? "768:1280" : "1280:768",
    duration,
  };

  console.log(`Runway: Starting generation (${duration}s, ${aspectRatio})...`);
  console.log(`Runway prompt: ${prompt.substring(0, 100)}...`);

  const response = await fetch(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    if (response.status === 429) {
      throw new Error("Runway: חריגה ממגבלת בקשות. נסה שוב בעוד דקה.");
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("Runway: מפתח API לא תקין. בדוק RUNWAY_API_KEY.");
    }
    throw new Error(`Runway API error [${response.status}]: ${errText}`);
  }

  const data = await response.json();
  const taskId = data.id;

  if (!taskId) {
    throw new Error("Runway: No task ID returned");
  }

  console.log(`Runway: Task started - ${taskId}`);
  return taskId;
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
