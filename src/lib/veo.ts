import { GoogleGenAI, type GenerateVideosOperation } from "@google/genai";
import fs from "fs";
import path from "path";
import os from "os";

let _ai: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!_ai) {
    _ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });
  }
  return _ai;
}

// Veo 3.1 Fast (no audio) = $0.10/sec = cheapest option
const VEO_MODEL = "veo-3.1-fast-generate-preview";

/**
 * Start generating a video clip with Veo 3.1 Fast.
 * Returns an operation object that must be polled for completion.
 */
export async function startVideoGeneration(
  prompt: string,
  aspectRatio: "16:9" | "9:16" = "16:9",
): Promise<GenerateVideosOperation> {
  const ai = getClient();

  const operation = await ai.models.generateVideos({
    model: VEO_MODEL,
    prompt: prompt,
    config: {
      aspectRatio,
      numberOfVideos: 1,
      // No audio generation - we add our own Hebrew VO
      generateAudio: false,
    },
  });

  return operation;
}

/**
 * Poll a Veo operation until it's done.
 * Returns the video file reference when complete.
 */
export async function pollVideoOperation(
  operationOrName: GenerateVideosOperation | string,
): Promise<{ done: boolean; operation: GenerateVideosOperation; error?: string }> {
  const ai = getClient();

  // Accept either a full operation object or just an operation name string
  const opInput = typeof operationOrName === "string"
    ? ({ name: operationOrName } as GenerateVideosOperation)
    : operationOrName;

  try {
    const result = await ai.operations.getVideosOperation({
      operation: opInput,
    });

    if (result.done) {
      const generatedVideos = result.response?.generatedVideos;
      if (generatedVideos && generatedVideos.length > 0) {
        return { done: true, operation: result };
      }
      const errorMsg = result.error
        ? JSON.stringify(result.error)
        : "No video generated";
      return { done: true, operation: result, error: errorMsg };
    }

    return { done: false, operation: result };
  } catch (e) {
    return {
      done: true,
      operation: opInput,
      error: e instanceof Error ? e.message : "Poll failed",
    };
  }
}

/**
 * Download a Veo-generated video file to a temporary file and return the path.
 */
export async function downloadVeoVideo(
  operation: GenerateVideosOperation,
): Promise<string> {
  const ai = getClient();

  const generatedVideos = operation.response?.generatedVideos;
  if (!generatedVideos || generatedVideos.length === 0) {
    throw new Error("No generated videos in operation response");
  }

  const video = generatedVideos[0].video;
  if (!video) {
    throw new Error("No video data in generated video");
  }

  // Download to temp file
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "veo-dl-"));
  const downloadPath = path.join(tmpDir, "clip.mp4");

  await ai.files.download({
    file: video,
    downloadPath,
  });

  return downloadPath;
}
