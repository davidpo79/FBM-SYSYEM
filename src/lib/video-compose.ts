import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import fs from "fs";
import path from "path";
import os from "os";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export interface ComposeScene {
  videoPath: string;
  audioPath: string;
  subtitleText: string;
  duration: number; // desired duration in seconds
}

export interface ComposeOptions {
  scenes: ComposeScene[];
  musicPath?: string;
  musicVolume?: number; // 0.0-1.0 (default 0.15)
  outputPath?: string;
}

/**
 * Generate SRT subtitle file from scenes.
 */
function generateSrt(scenes: ComposeScene[]): string {
  let srtContent = "";
  let currentTime = 0;
  let subtitleIndex = 1;

  for (const scene of scenes) {
    const words = scene.subtitleText.split(" ");
    const lines: string[] = [];
    let currentLine = "";
    for (const word of words) {
      if ((currentLine + " " + word).trim().length > 40 && currentLine) {
        lines.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine = (currentLine + " " + word).trim();
      }
    }
    if (currentLine) lines.push(currentLine.trim());

    const blockCount = Math.ceil(lines.length / 2);
    for (let i = 0; i < lines.length; i += 2) {
      const block = lines.slice(i, i + 2).join("\n");
      const blockDuration = scene.duration / blockCount;
      const blockStart = currentTime + (i / 2) * blockDuration;
      const blockEnd = blockStart + blockDuration;

      srtContent += `${subtitleIndex}\n`;
      srtContent += `${fmtTime(blockStart)} --> ${fmtTime(blockEnd)}\n`;
      srtContent += `${block}\n\n`;
      subtitleIndex++;
    }

    currentTime += scene.duration;
  }

  return srtContent;
}

function fmtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

/**
 * Trim a video clip to a specific duration.
 * If the clip is shorter, it loops to fill the duration.
 */
function trimClip(
  inputPath: string,
  outputPath: string,
  duration: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .inputOptions(["-stream_loop", "-1"]) // loop if shorter
      .outputOptions([
        "-t", String(duration),
        "-vf", "scale=-2:1280,crop=720:1280,setsar=1",
        "-an", // strip audio from stock clips
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "23",
        "-r", "30",
        "-y",
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .run();
  });
}

/**
 * Compose a final MP4 from Pexels clips, voice-over, subtitles, and background music.
 *
 * Pipeline:
 * 1. Trim each clip to scene duration (normalize resolution)
 * 2. Concatenate trimmed clips
 * 3. Concatenate voice-over audio
 * 4. Mix with background music
 * 5. Burn in Hebrew subtitles
 * 6. Output final MP4
 */
export async function composeVideo(options: ComposeOptions): Promise<string> {
  const { scenes, musicPath, musicVolume = 0.15 } = options;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fbm-video-"));
  const outputPath = options.outputPath || path.join(tmpDir, "final-video.mp4");

  try {
    // 1. Trim and normalize each clip
    const trimmedPaths: string[] = [];
    for (let i = 0; i < scenes.length; i++) {
      const trimmedPath = path.join(tmpDir, `trimmed-${i}.mp4`);
      await trimClip(scenes[i].videoPath, trimmedPath, scenes[i].duration);
      trimmedPaths[i] = trimmedPath;
    }

    // 2. Generate SRT subtitles
    const srtPath = path.join(tmpDir, "subtitles.srt");
    const srtContent = generateSrt(scenes);
    fs.writeFileSync(srtPath, srtContent, "utf-8");

    // 3. Concatenate trimmed videos
    const concatVideoPath = path.join(tmpDir, "concat-video.mp4");
    await concatFiles(trimmedPaths, concatVideoPath, "video");

    // 4. Concatenate audio (normalized to WAV for consistency)
    const concatAudioPath = path.join(tmpDir, "concat-audio.wav");
    await concatFiles(
      scenes.map((s) => s.audioPath),
      concatAudioPath,
      "audio",
    );

    // 5. Final composition: video + voice-over + music + subtitles
    const ffmpegCmd = ffmpeg()
      .input(concatVideoPath)
      .input(concatAudioPath);

    const filterParts: string[] = [];

    if (musicPath && fs.existsSync(musicPath)) {
      ffmpegCmd.input(musicPath);
      filterParts.push(
        `[1:a]volume=1.0[vo]`,
        `[2:a]volume=${musicVolume},afade=t=out:st=55:d=5[music]`,
        `[vo][music]amix=inputs=2:duration=first:dropout_transition=3[aout]`,
      );
    } else {
      filterParts.push(`[1:a]volume=1.0[aout]`);
    }

    const srtEscaped = srtPath.replace(/\\/g, "/").replace(/'/g, "\\'").replace(/:/g, "\\:");
    const subtitleFilter = `subtitles='${srtEscaped}':force_style='FontName=Arial,FontSize=22,Alignment=2,MarginV=35,PrimaryColour=&HFFFFFF&,OutlineColour=&H80000000&,BorderStyle=4,Outline=0,Shadow=0,BackColour=&H80000000&'`;

    ffmpegCmd
      .complexFilter([
        ...filterParts,
        `[0:v]${subtitleFilter}[vout]`,
      ])
      .outputOptions([
        "-map", "[vout]",
        "-map", "[aout]",
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        "-y",
      ])
      .output(outputPath);

    await runFfmpeg(ffmpegCmd);

    return outputPath;
  } catch (error) {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
    throw error;
  }
}

/**
 * Normalize an audio file to consistent WAV format (24kHz, mono).
 * This ensures all audio files can be concatenated without format mismatches.
 */
function normalizeAudio(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        "-ar", "24000",
        "-ac", "1",
        "-c:a", "pcm_s16le",
        "-y",
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .run();
  });
}

/**
 * Concatenate files. For audio, normalizes to consistent format first
 * and uses the concat demuxer (more reliable than the concat filter for audio).
 */
async function concatFiles(
  inputPaths: string[],
  outputPath: string,
  type: "video" | "audio",
): Promise<void> {
  if (inputPaths.length === 0) {
    throw new Error("No input files to concatenate");
  }

  if (inputPaths.length === 1) {
    if (type === "audio") {
      // Still normalize even single files to ensure consistent format
      await normalizeAudio(inputPaths[0], outputPath);
    } else {
      fs.copyFileSync(inputPaths[0], outputPath);
    }
    return;
  }

  if (type === "audio") {
    // Normalize all audio files to WAV first, then use concat demuxer
    const normalizedPaths: string[] = [];
    const dir = path.dirname(outputPath);

    for (let i = 0; i < inputPaths.length; i++) {
      const normPath = path.join(dir, `norm-audio-${i}.wav`);
      await normalizeAudio(inputPaths[i], normPath);
      normalizedPaths.push(normPath);
    }

    // Create concat list file
    const listPath = path.join(dir, "audio-list.txt");
    const listContent = normalizedPaths.map((p) => `file '${p}'`).join("\n");
    fs.writeFileSync(listPath, listContent, "utf-8");

    // Concat using demuxer
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(listPath)
        .inputOptions(["-f", "concat", "-safe", "0"])
        .outputOptions(["-c:a", "pcm_s16le", "-y"])
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", (err: Error) => reject(err))
        .run();
    });
  }

  // Video: use concat filter (all trimmed clips already have matching format)
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();
    for (const p of inputPaths) {
      cmd.input(p);
    }

    const n = inputPaths.length;
    const streamLabels = inputPaths.map((_, i) => `[${i}:v]`);
    const concatFilter = `${streamLabels.join("")}concat=n=${n}:v=1:a=0[out]`;

    cmd
      .complexFilter([concatFilter])
      .outputOptions(["-map", "[out]", "-y"])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .run();
  });
}

function runFfmpeg(cmd: ffmpeg.FfmpegCommand): Promise<void> {
  return new Promise((resolve, reject) => {
    cmd
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .run();
  });
}

export function cleanupTempDir(filePath: string): void {
  try {
    const dir = path.dirname(filePath);
    if (dir.includes("fbm-video-")) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch {}
}
