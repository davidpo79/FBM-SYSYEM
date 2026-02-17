import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import fs from "fs";
import path from "path";
import os from "os";

// Set FFmpeg binary path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export interface ComposeScene {
  videoPath: string;     // Path to Veo video clip
  audioPath: string;     // Path to TTS voice-over MP3
  subtitleText: string;  // Hebrew subtitle text
  duration: number;      // Scene duration in seconds
}

export interface ComposeOptions {
  scenes: ComposeScene[];
  musicPath?: string;        // Background music file path
  musicVolume?: number;      // 0.0-1.0 (default 0.15)
  outputPath?: string;       // Custom output path
}

/**
 * Generate SRT subtitle file from scenes.
 */
function generateSrt(scenes: ComposeScene[]): string {
  let srtContent = "";
  let currentTime = 0;
  let subtitleIndex = 1;

  for (const scene of scenes) {
    const startH = Math.floor(currentTime / 3600);
    const startM = Math.floor((currentTime % 3600) / 60);
    const startS = Math.floor(currentTime % 60);
    const startMs = Math.floor((currentTime % 1) * 1000);

    const endTime = currentTime + scene.duration;
    const endH = Math.floor(endTime / 3600);
    const endM = Math.floor((endTime % 3600) / 60);
    const endS = Math.floor(endTime % 60);
    const endMs = Math.floor((endTime % 1) * 1000);

    const formatTime = (h: number, m: number, s: number, ms: number) =>
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;

    // Split long subtitle text into 2-line chunks (max ~40 chars per line)
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

    // Group into 2-line blocks
    for (let i = 0; i < lines.length; i += 2) {
      const block = lines.slice(i, i + 2).join("\n");
      const blockDuration = scene.duration / Math.ceil(lines.length / 2);
      const blockStart = currentTime + i / 2 * blockDuration;
      const blockEnd = blockStart + blockDuration;

      const bStartH = Math.floor(blockStart / 3600);
      const bStartM = Math.floor((blockStart % 3600) / 60);
      const bStartS = Math.floor(blockStart % 60);
      const bStartMs = Math.floor((blockStart % 1) * 1000);

      const bEndH = Math.floor(blockEnd / 3600);
      const bEndM = Math.floor((blockEnd % 3600) / 60);
      const bEndS = Math.floor(blockEnd % 60);
      const bEndMs = Math.floor((blockEnd % 1) * 1000);

      srtContent += `${subtitleIndex}\n`;
      srtContent += `${formatTime(bStartH, bStartM, bStartS, bStartMs)} --> ${formatTime(bEndH, bEndM, bEndS, bEndMs)}\n`;
      srtContent += `${block}\n\n`;
      subtitleIndex++;
    }

    currentTime = endTime;
  }

  return srtContent;
}

/**
 * Compose a final MP4 video from Veo clips, voice-over, subtitles, and background music.
 *
 * Pipeline:
 * 1. Concatenate all Veo video clips
 * 2. Concatenate all voice-over audio files
 * 3. Mix voice-over with background music
 * 4. Burn in Hebrew subtitles
 * 5. Output single MP4 file
 */
export async function composeVideo(options: ComposeOptions): Promise<string> {
  const { scenes, musicPath, musicVolume = 0.15 } = options;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fbm-video-"));
  const outputPath = options.outputPath || path.join(tmpDir, "final-video.mp4");

  try {
    // 1. Generate SRT subtitles
    const srtPath = path.join(tmpDir, "subtitles.srt");
    const srtContent = generateSrt(scenes);
    fs.writeFileSync(srtPath, srtContent, "utf-8");

    // 2. Concatenate videos using concat filter
    const concatVideoPath = path.join(tmpDir, "concat-video.mp4");
    await concatFiles(
      scenes.map((s) => s.videoPath),
      concatVideoPath,
      "video",
    );

    // 3. Concatenate audio using concat filter
    const concatAudioPath = path.join(tmpDir, "concat-audio.mp3");
    await concatFiles(
      scenes.map((s) => s.audioPath),
      concatAudioPath,
      "audio",
    );

    // 4. Final composition: video + voice-over + music + subtitles
    const ffmpegCmd = ffmpeg()
      .input(concatVideoPath)
      .input(concatAudioPath);

    const filterParts: string[] = [];

    if (musicPath && fs.existsSync(musicPath)) {
      ffmpegCmd.input(musicPath);
      filterParts.push(
        `[1:a]volume=1.0[vo]`,
        `[2:a]volume=${musicVolume},afade=t=out:st=55:d=5[music]`,
        `[vo][music]amix=inputs=2:duration=first:dropout_transition=3[aout]`
      );
    } else {
      filterParts.push(`[1:a]volume=1.0[aout]`);
    }

    const subtitleFilter = `subtitles='${srtPath.replace(/\\/g, "/").replace(/'/g, "\\'")}':force_style='FontName=Arial,FontSize=22,Alignment=2,MarginV=35,PrimaryColour=&HFFFFFF&,OutlineColour=&H80000000&,BorderStyle=4,Outline=0,Shadow=0,BackColour=&H80000000&'`;

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
 * Concatenate files using the concat filter (avoids concat demuxer file issues).
 */
function concatFiles(
  inputPaths: string[],
  outputPath: string,
  type: "video" | "audio",
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (inputPaths.length === 0) {
      return reject(new Error("No input files to concatenate"));
    }

    // Single file: just copy it
    if (inputPaths.length === 1) {
      fs.copyFileSync(inputPaths[0], outputPath);
      return resolve();
    }

    const cmd = ffmpeg();
    for (const p of inputPaths) {
      cmd.input(p);
    }

    const n = inputPaths.length;
    const streamLabels = inputPaths.map((_, i) =>
      type === "video" ? `[${i}:v]` : `[${i}:a]`
    );
    const concatFilter =
      type === "video"
        ? `${streamLabels.join("")}concat=n=${n}:v=1:a=0[out]`
        : `${streamLabels.join("")}concat=n=${n}:v=0:a=1[out]`;

    cmd
      .complexFilter([concatFilter])
      .outputOptions(["-map", "[out]", "-y"])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .run();
  });
}

/**
 * Run an FFmpeg command and return a promise.
 */
function runFfmpeg(cmd: ffmpeg.FfmpegCommand): Promise<void> {
  return new Promise((resolve, reject) => {
    cmd
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .run();
  });
}

/**
 * Cleanup temporary files after upload.
 */
export function cleanupTempDir(filePath: string): void {
  try {
    const dir = path.dirname(filePath);
    if (dir.includes("fbm-video-")) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch {}
}
