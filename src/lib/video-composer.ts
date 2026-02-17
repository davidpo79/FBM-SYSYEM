import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

let ffmpegInstance: FFmpeg | null = null;

export type VideoFormat = "9:16" | "1:1";

export interface RenderScene {
  index: number;
  type: "b-roll" | "selfie";
  duration: number;
  imageBlob?: Blob;
  audioBlob?: Blob;
  titleText?: string;
}

export type ProgressCallback = (step: string, progress: number) => void;

const FORMAT_DIMS: Record<VideoFormat, { w: number; h: number }> = {
  "9:16": { w: 1080, h: 1920 },
  "1:1": { w: 1080, h: 1080 },
};

export async function loadFFmpeg(
  onLog?: (msg: string) => void,
): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) return ffmpegInstance;

  const ff = new FFmpeg();
  ff.on("log", ({ message }) => onLog?.(message));

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
  await ff.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(
      `${baseURL}/ffmpeg-core.wasm`,
      "application/wasm",
    ),
  });

  ffmpegInstance = ff;
  return ff;
}

/** Generate a title card image for selfie scenes using Canvas */
export function generateTitleCard(
  text: string,
  format: VideoFormat,
): Promise<Blob> {
  const { w, h } = FORMAT_DIMS[format];
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Dark background
  ctx.fillStyle = "#0F1117";
  ctx.fillRect(0, 0, w, h);

  // Subtle gradient overlay
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "rgba(212, 168, 67, 0.08)");
  grad.addColorStop(0.5, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(212, 168, 67, 0.05)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Gold line
  const lineY = h * 0.38;
  ctx.strokeStyle = "#D4A843";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w * 0.15, lineY);
  ctx.lineTo(w * 0.85, lineY);
  ctx.stroke();

  // Camera emoji text
  const emojiSize = Math.min(w, h) * 0.07;
  ctx.font = `${emojiSize}px Arial`;
  ctx.textAlign = "center";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText("\u{1F4F9}", w / 2, h * 0.3);

  // "Film yourself here" title
  const titleSize = Math.min(w, h) * 0.03;
  ctx.font = `bold ${titleSize}px Arial, sans-serif`;
  ctx.fillStyle = "#D4A843";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = "rtl";
  ctx.fillText("\u05DB\u05D0\u05DF \u05EA\u05E6\u05DC\u05DD \u05D0\u05EA \u05E2\u05E6\u05DE\u05DA", w / 2, h * 0.43);

  // Teleprompter text (word-wrapped)
  const textSize = Math.min(w, h) * 0.022;
  ctx.font = `${textSize}px Arial, sans-serif`;
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";

  const maxWidth = w * 0.7;
  const lineHeight = textSize * 1.6;
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const startY = h * 0.52;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], w / 2, startY + i * lineHeight);
  }

  // Gold line bottom
  ctx.strokeStyle = "#D4A843";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w * 0.15, h * 0.62 + lines.length * lineHeight);
  ctx.lineTo(w * 0.85, h * 0.62 + lines.length * lineHeight);
  ctx.stroke();

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob!),
      "image/png",
    );
  });
}

/** Create a short silent MP3 buffer (~1 second) used for padding */
async function createSilentAudio(ff: FFmpeg, durationSec: number, filename: string) {
  await ff.exec([
    "-f", "lavfi",
    "-i", `anullsrc=r=44100:cl=stereo`,
    "-t", String(durationSec),
    "-c:a", "aac",
    "-b:a", "64k",
    filename,
  ]);
}

/** Render a complete video from scenes */
export async function renderVideo(
  scenes: RenderScene[],
  format: VideoFormat,
  onProgress?: ProgressCallback,
): Promise<Blob> {
  onProgress?.("\u05D8\u05D5\u05E2\u05DF FFmpeg...", 0);
  const ff = await loadFFmpeg();
  const { w, h } = FORMAT_DIMS[format];
  const sceneOutputs: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const pct = (i / scenes.length) * 0.85;
    onProgress?.(
      `\u05DE\u05E2\u05D1\u05D3 \u05E1\u05E6\u05E0\u05D4 ${i + 1} \u05DE\u05EA\u05D5\u05DA ${scenes.length}`,
      pct,
    );

    const imgFile = `img_${i}.png`;
    const audioFile = `audio_${i}.mp3`;
    const outFile = `scene_${i}.mp4`;

    // Write image
    if (scene.imageBlob) {
      await ff.writeFile(imgFile, new Uint8Array(await scene.imageBlob.arrayBuffer()));
    }

    if (scene.audioBlob) {
      // Has audio → image + audio
      await ff.writeFile(audioFile, new Uint8Array(await scene.audioBlob.arrayBuffer()));
      await ff.exec([
        "-loop", "1",
        "-i", imgFile,
        "-i", audioFile,
        "-c:v", "libx264",
        "-tune", "stillimage",
        "-c:a", "aac",
        "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "-vf", `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black`,
        "-shortest",
        "-t", String(scene.duration),
        outFile,
      ]);
      await ff.deleteFile(audioFile);
    } else {
      // No audio → image + silent audio
      const silentFile = `silent_${i}.aac`;
      await createSilentAudio(ff, scene.duration, silentFile);
      await ff.exec([
        "-loop", "1",
        "-i", imgFile,
        "-i", silentFile,
        "-c:v", "libx264",
        "-tune", "stillimage",
        "-c:a", "aac",
        "-b:a", "64k",
        "-pix_fmt", "yuv420p",
        "-vf", `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black`,
        "-t", String(scene.duration),
        outFile,
      ]);
      await ff.deleteFile(silentFile);
    }

    await ff.deleteFile(imgFile);
    sceneOutputs.push(outFile);
  }

  // Concatenate all scenes
  onProgress?.("\u05DE\u05E8\u05DB\u05D9\u05D1 \u05E1\u05E8\u05D8\u05D5\u05DF \u05E1\u05D5\u05E4\u05D9...", 0.9);
  const concatList = sceneOutputs.map((f) => `file '${f}'`).join("\n");
  await ff.writeFile("concat.txt", concatList);

  await ff.exec([
    "-f", "concat",
    "-safe", "0",
    "-i", "concat.txt",
    "-c", "copy",
    "final.mp4",
  ]);

  // Read result
  const data = await ff.readFile("final.mp4");

  // Cleanup
  for (const f of sceneOutputs) {
    try { await ff.deleteFile(f); } catch { /* ignore */ }
  }
  try { await ff.deleteFile("concat.txt"); } catch { /* ignore */ }
  try { await ff.deleteFile("final.mp4"); } catch { /* ignore */ }

  onProgress?.("\u05D4\u05E1\u05E8\u05D8\u05D5\u05DF \u05DE\u05D5\u05DB\u05DF!", 1.0);

  const arrayData = typeof data === "string"
    ? new TextEncoder().encode(data).buffer as ArrayBuffer
    : (data as Uint8Array).buffer.slice(
        (data as Uint8Array).byteOffset,
        (data as Uint8Array).byteOffset + (data as Uint8Array).byteLength,
      ) as ArrayBuffer;
  return new Blob([arrayData], { type: "video/mp4" });
}
