import { GoogleGenAI, type GenerateVideosOperation } from "@google/genai";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import fs from "fs";
import path from "path";
import os from "os";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

let _ai: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!_ai) {
    _ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });
  }
  return _ai;
}

// Veo 3.1 Fast (no audio) = $0.10/sec = cheapest option
const VEO_MODEL = "veo-3.1-fast-generate-preview";
const IMAGEN_MODEL = "imagen-4.0-generate-001";

/**
 * Start generating a video clip with Veo 3.1 Fast.
 * Returns an operation object that must be polled for completion.
 */
export async function startVideoGeneration(
  prompt: string,
  aspectRatio: "16:9" | "9:16" = "16:9",
): Promise<GenerateVideosOperation> {
  const ai = getClient();

  try {
    const operation = await ai.models.generateVideos({
      model: VEO_MODEL,
      prompt: prompt,
      config: {
        aspectRatio,
        numberOfVideos: 1,
      },
    });

    return operation;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("חריגה ממגבלת Veo API (2 בקשות לדקה / 10 ביום). נסה שוב מאוחר יותר.");
    }
    throw e;
  }
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

// ═══════════════════════════════════════════════════════
// Imagen 3 fallback: image → Ken Burns video clip
// ═══════════════════════════════════════════════════════

/**
 * Generate an image with Imagen 3 and convert it to a video clip
 * using FFmpeg Ken Burns effect (slow zoom/pan).
 * No rate limit issues like Veo.
 */
export async function generateImageClip(
  prompt: string,
  durationSec: number = 10,
  aspectRatio: "16:9" | "9:16" = "16:9",
): Promise<string> {
  const ai = getClient();

  // 1. Generate image with Imagen 3
  const response = await ai.models.generateImages({
    model: IMAGEN_MODEL,
    prompt,
    config: {
      numberOfImages: 1,
      aspectRatio,
    },
  });

  const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
  if (!imageBytes) {
    throw new Error("Imagen failed to generate image");
  }

  // 2. Save image to temp file
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "imagen-clip-"));
  const imagePath = path.join(tmpDir, "scene.png");
  fs.writeFileSync(imagePath, Buffer.from(imageBytes, "base64"));

  // 3. Convert to video with Ken Burns effect (slow zoom)
  const outputPath = path.join(tmpDir, "clip.mp4");
  const fps = 30;
  const totalFrames = durationSec * fps;

  const zoomFilter = `zoompan=z='min(zoom+0.0015,1.5)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=1920x1080:fps=${fps}`;

  await runFfmpeg(imagePath, outputPath, zoomFilter, durationSec);
  return outputPath;
}

function runFfmpeg(
  imagePath: string,
  outputPath: string,
  videoFilter: string,
  durationSec: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(imagePath)
      .inputOptions(["-loop", "1"])
      .videoFilter(videoFilter)
      .duration(durationSec)
      .outputOptions(["-c:v", "libx264", "-preset", "fast", "-crf", "23", "-pix_fmt", "yuv420p"])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err: Error) => {
        // Fallback: simple static image → video (no Ken Burns)
        ffmpeg()
          .input(imagePath)
          .inputOptions(["-loop", "1"])
          .videoFilter("scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2")
          .duration(durationSec)
          .outputOptions(["-c:v", "libx264", "-preset", "fast", "-crf", "23", "-pix_fmt", "yuv420p"])
          .output(outputPath)
          .on("end", () => resolve())
          .on("error", (err2: Error) => reject(err2))
          .run();
      })
      .run();
  });
}
