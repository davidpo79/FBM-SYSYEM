import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
const FFMPEG_PATH = ffmpegInstaller.path;

const FONT_CACHE_DIR = path.join(os.tmpdir(), "fbm-fonts");

// Multiple font URLs to try (static weight fonts, not variable)
const FONT_SOURCES = [
  {
    url: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/heebo/static/Heebo-Bold.ttf",
    filename: "Heebo-Bold.ttf",
    family: "Heebo",
  },
  {
    url: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/assistant/static/Assistant-Bold.ttf",
    filename: "Assistant-Bold.ttf",
    family: "Assistant",
  },
  {
    url: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/rubik/static/Rubik-Bold.ttf",
    filename: "Rubik-Bold.ttf",
    family: "Rubik",
  },
];

export interface ComposeScene {
  videoPath: string;
  audioPath: string;
  subtitleText: string;
  duration: number;
}

export interface ComposeOptions {
  scenes: ComposeScene[];
  musicPath?: string;
  musicVolume?: number;
  outputPath?: string;
}

export interface ComposeResult {
  outputPath: string;
  fontUsed: string;
  hasMusicTrack: boolean;
}

// Bundled font location (downloaded during postinstall / build)
const BUNDLED_FONT_DIR = path.join(process.cwd(), "public", "fonts");
const BUNDLED_FONT_FILE = "Heebo-Bold.ttf";
const BUNDLED_FONT_FAMILY = "Heebo";

/**
 * Download a Hebrew-supporting TTF font. Tries multiple sources.
 * Returns { fontDir, fontFamily, fontFile } or null if all fail.
 *
 * Priority: bundled font → cache → CDN download
 */
async function ensureHebrewFont(): Promise<{ fontDir: string; fontFamily: string; fontFile: string } | null> {
  // 1. Check bundled font (committed to repo / downloaded during build)
  const bundledPath = path.join(BUNDLED_FONT_DIR, BUNDLED_FONT_FILE);
  if (fs.existsSync(bundledPath) && fs.statSync(bundledPath).size > 5000) {
    console.log(`Font bundled: ${BUNDLED_FONT_FILE} (${fs.statSync(bundledPath).size} bytes)`);
    return { fontDir: BUNDLED_FONT_DIR, fontFamily: BUNDLED_FONT_FAMILY, fontFile: bundledPath };
  }

  // 2. Check cache
  fs.mkdirSync(FONT_CACHE_DIR, { recursive: true });
  for (const src of FONT_SOURCES) {
    const fontPath = path.join(FONT_CACHE_DIR, src.filename);
    if (fs.existsSync(fontPath) && fs.statSync(fontPath).size > 5000) {
      console.log(`Font cached: ${src.filename} (${src.family})`);
      return { fontDir: FONT_CACHE_DIR, fontFamily: src.family, fontFile: fontPath };
    }
  }

  // 3. Try downloading each font source
  for (const src of FONT_SOURCES) {
    try {
      console.log(`Downloading font: ${src.filename}...`);
      const res = await fetch(src.url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) {
        console.warn(`Font download failed (${res.status}): ${src.url}`);
        continue;
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 5000) {
        console.warn(`Font file too small: ${buffer.length} bytes`);
        continue;
      }
      const fontPath = path.join(FONT_CACHE_DIR, src.filename);
      fs.writeFileSync(fontPath, buffer);
      console.log(`Font ready: ${src.filename} (${buffer.length} bytes, family: ${src.family})`);
      return { fontDir: FONT_CACHE_DIR, fontFamily: src.family, fontFile: fontPath };
    } catch (e) {
      console.warn(`Font download error (${src.filename}):`, e instanceof Error ? e.message : e);
    }
  }

  console.error("ALL font sources failed - subtitles will use drawtext fallback");
  return null;
}

/**
 * Generate ambient background music using FFmpeg.
 * Creates a warm, professional sounding background pad.
 */
function generateAmbientMusic(outputPath: string, durationSec: number): boolean {
  try {
    execSync(
      `"${FFMPEG_PATH}" -f lavfi -i "sine=frequency=174:duration=${durationSec}" ` +
        `-f lavfi -i "sine=frequency=220:duration=${durationSec}" ` +
        `-f lavfi -i "anoisesrc=d=${durationSec}:c=pink:r=44100:a=0.01" ` +
        `-filter_complex "` +
        `[0:a]volume=0.06,lowpass=f=400[drone1];` +
        `[1:a]volume=0.04,lowpass=f=500,tremolo=f=0.3:d=0.4[drone2];` +
        `[2:a]lowpass=f=200,volume=0.8[noise];` +
        `[drone1][drone2][noise]amix=inputs=3:duration=first,` +
        `afade=t=in:st=0:d=2,afade=t=out:st=${Math.max(0, durationSec - 3)}:d=3,` +
        `volume=2.0[out]" ` +
        `-map "[out]" -c:a libmp3lame -q:a 2 "${outputPath}" -y`,
      { stdio: "pipe", timeout: 30000 },
    );
    console.log("Ambient music generated OK");
    return true;
  } catch (e) {
    console.error("Ambient music FAILED:", e instanceof Error ? e.message : e);
    return false;
  }
}

/**
 * Generate ASS subtitle file from scenes (better than SRT for styled Hebrew).
 */
function generateAss(scenes: ComposeScene[], fontFamily: string): string {
  let ass = "\uFEFF"; // UTF-8 BOM
  ass += "[Script Info]\n";
  ass += "ScriptType: v4.00+\n";
  ass += "PlayResX: 720\n";
  ass += "PlayResY: 1280\n";
  ass += "WrapStyle: 0\n";
  ass += "\n";
  ass += "[V4+ Styles]\n";
  ass += "Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\n";
  ass += `Style: Default,${fontFamily},42,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,2,30,30,100,0\n`;
  ass += "\n";
  ass += "[Events]\n";
  ass += "Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n";

  let currentTime = 0;

  for (const scene of scenes) {
    const words = scene.subtitleText.split(" ");
    const lines: string[] = [];
    let currentLine = "";
    for (const word of words) {
      if ((currentLine + " " + word).trim().length > 25 && currentLine) {
        lines.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine = (currentLine + " " + word).trim();
      }
    }
    if (currentLine) lines.push(currentLine.trim());

    const blockCount = Math.ceil(lines.length / 2);
    for (let i = 0; i < lines.length; i += 2) {
      const block = lines.slice(i, i + 2).join("\\N");
      const blockDuration = scene.duration / blockCount;
      const blockStart = currentTime + (i / 2) * blockDuration;
      const blockEnd = blockStart + blockDuration;

      ass += `Dialogue: 0,${fmtTimeAss(blockStart)},${fmtTimeAss(blockEnd)},Default,,0,0,0,,${block}\n`;
    }

    currentTime += scene.duration;
  }

  return ass;
}

/**
 * Build a drawtext filter chain as fallback for ASS subtitles.
 * Displays subtitle text per scene using FFmpeg drawtext.
 */
function buildDrawtextFilter(scenes: ComposeScene[], fontFile: string): string {
  const parts: string[] = [];
  let currentTime = 0;

  for (const scene of scenes) {
    if (!scene.subtitleText.trim()) {
      currentTime += scene.duration;
      continue;
    }

    // Split into 2-line blocks (similar to ASS logic)
    const words = scene.subtitleText.split(" ");
    const lines: string[] = [];
    let currentLine = "";
    for (const word of words) {
      if ((currentLine + " " + word).trim().length > 20 && currentLine) {
        lines.push(currentLine.trim());
        currentLine = word;
      } else {
        currentLine = (currentLine + " " + word).trim();
      }
    }
    if (currentLine) lines.push(currentLine.trim());

    const blockCount = Math.ceil(lines.length / 2);
    for (let i = 0; i < lines.length; i += 2) {
      const blockLines = lines.slice(i, i + 2);
      const blockDuration = scene.duration / blockCount;
      const blockStart = currentTime + (i / 2) * blockDuration;
      const blockEnd = blockStart + blockDuration;

      const escapedText = blockLines
        .join("\n")
        .replace(/'/g, "\u2019")
        .replace(/:/g, "\\:")
        .replace(/%/g, "%%");

      parts.push(
        `drawtext=fontfile='${fontFile}':text='${escapedText}':` +
          `fontsize=38:fontcolor=white:bordercolor=black:borderw=3:` +
          `x=(w-text_w)/2:y=h-180:` +
          `enable='between(t,${blockStart.toFixed(2)},${blockEnd.toFixed(2)})'`,
      );
    }

    currentTime += scene.duration;
  }

  return parts.length > 0 ? parts.join(",") : "null";
}

function fmtTimeAss(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

/**
 * Trim a video clip to a specific duration.
 */
function trimClip(
  inputPath: string,
  outputPath: string,
  duration: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .inputOptions(["-stream_loop", "-1"])
      .outputOptions([
        "-t", String(duration),
        "-vf", "scale=-2:1280,crop=720:1280,setsar=1",
        "-an",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "23",
        "-r", "30",
        "-pix_fmt", "yuv420p",
        "-y",
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .run();
  });
}

/**
 * Compose final MP4 from Pexels clips, voice-over, subtitles, and background music.
 */
export async function composeVideo(options: ComposeOptions): Promise<ComposeResult> {
  const { scenes, musicVolume = 0.15 } = options;
  let { musicPath } = options;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fbm-video-"));
  const outputPath = options.outputPath || path.join(tmpDir, "final-video.mp4");

  let fontUsed = "none";
  let hasMusicTrack = false;

  try {
    console.log(`\n=== COMPOSE VIDEO: ${scenes.length} scenes ===`);

    // 1. Trim and normalize each clip
    const trimmedPaths: string[] = [];
    for (let i = 0; i < scenes.length; i++) {
      console.log(`Trimming clip ${i + 1}/${scenes.length} (${scenes[i].duration}s)...`);
      const trimmedPath = path.join(tmpDir, `trimmed-${i}.mp4`);
      await trimClip(scenes[i].videoPath, trimmedPath, scenes[i].duration);
      trimmedPaths[i] = trimmedPath;
    }

    // 2. Download Hebrew font + Generate ASS subtitles
    const fontResult = await ensureHebrewFont();
    const fontFamily = fontResult?.fontFamily || "Sans";
    fontUsed = fontFamily;

    const assPath = path.join(tmpDir, "subtitles.ass");
    const assContent = generateAss(scenes, fontFamily);
    fs.writeFileSync(assPath, assContent, "utf-8");
    console.log("ASS subtitle file written");

    // 3. Concatenate trimmed videos
    console.log("Concatenating video clips...");
    const concatVideoPath = path.join(tmpDir, "concat-video.mp4");
    await concatFiles(trimmedPaths, concatVideoPath, "video");

    // 4. Concatenate audio (normalized to WAV)
    console.log("Concatenating audio...");
    const concatAudioPath = path.join(tmpDir, "concat-audio.wav");
    await concatFiles(
      scenes.map((s) => s.audioPath),
      concatAudioPath,
      "audio",
    );

    // Verify audio file
    const audioStat = fs.statSync(concatAudioPath);
    console.log(`Concatenated audio: ${audioStat.size} bytes`);

    // 5. Handle background music
    if (!musicPath || !fs.existsSync(musicPath)) {
      const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
      const ambientPath = path.join(tmpDir, "ambient-music.mp3");
      const ok = generateAmbientMusic(ambientPath, totalDuration + 5);
      if (ok && fs.existsSync(ambientPath) && fs.statSync(ambientPath).size > 100) {
        musicPath = ambientPath;
      }
    }

    // 6. Final composition: video + audio + [music] + subtitles
    const effectiveMusicVolume = musicVolume > 0 ? musicVolume : 0.15;

    // Build subtitle filter
    const assEscaped = assPath
      .replace(/\\/g, "/")
      .replace(/'/g, "\\'")
      .replace(/:/g, "\\:");
    const fontDirEscaped = fontResult
      ? fontResult.fontDir.replace(/\\/g, "/").replace(/'/g, "\\'").replace(/:/g, "\\:")
      : "";

    let subtitleFilter: string;
    if (fontResult) {
      subtitleFilter = `ass='${assEscaped}':fontsdir='${fontDirEscaped}'`;
    } else {
      subtitleFilter = `ass='${assEscaped}'`;
    }

    // Try ASS subtitles first, fallback to drawtext if ASS fails
    let composedWithSubs = false;
    const composeWithFilter = async (vFilter: string, label: string): Promise<boolean> => {
      const cmd = ffmpeg().input(concatVideoPath).input(concatAudioPath);
      const filterParts: string[] = [];

      if (musicPath && fs.existsSync(musicPath)) {
        cmd.input(musicPath);
        filterParts.push(
          `[1:a]volume=1.0[vo]`,
          `[2:a]volume=${effectiveMusicVolume},afade=t=out:st=55:d=5[music]`,
          `[vo][music]amix=inputs=2:duration=first:dropout_transition=3[aout]`,
        );
        hasMusicTrack = true;
      } else {
        filterParts.push(`[1:a]volume=1.0[aout]`);
      }

      filterParts.push(`[0:v]${vFilter}[vout]`);

      cmd
        .complexFilter(filterParts)
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

      try {
        await runFfmpeg(cmd);
        console.log(`Compose OK with ${label}`);
        return true;
      } catch (e) {
        console.warn(`Compose FAILED with ${label}:`, e instanceof Error ? e.message : e);
        return false;
      }
    };

    console.log("Composing final video (ASS subtitles)...");
    composedWithSubs = await composeWithFilter(subtitleFilter, "ASS subtitles");

    // Fallback: drawtext (if ASS failed and we have a font file)
    if (!composedWithSubs && fontResult?.fontFile) {
      console.log("Trying drawtext fallback...");
      const fontFileEscaped = fontResult.fontFile
        .replace(/\\/g, "/")
        .replace(/'/g, "\\'")
        .replace(/:/g, "\\:");
      // Build a drawtext filter chain from the ASS data
      const drawtextFilter = buildDrawtextFilter(scenes, fontFileEscaped);
      composedWithSubs = await composeWithFilter(drawtextFilter, "drawtext");
      if (composedWithSubs) fontUsed = `${fontFamily}-drawtext`;
    }

    // Last resort: no subtitles at all
    if (!composedWithSubs) {
      console.warn("Composing WITHOUT subtitles (all subtitle methods failed)");
      composedWithSubs = await composeWithFilter("null", "no subtitles");
      fontUsed = "none-failed";
    }

    console.log(`Music track: ${hasMusicTrack ? "included" : "none"}`);
    console.log("=== COMPOSE COMPLETE ===\n");

    return { outputPath, fontUsed, hasMusicTrack };
  } catch (error) {
    console.error("COMPOSE ERROR:", error);
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    throw error;
  }
}

/**
 * Normalize an audio file to consistent WAV format (44.1kHz, mono).
 */
function normalizeAudio(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions(["-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le", "-y"])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .run();
  });
}

/**
 * Concatenate files. Audio uses concat demuxer, video uses concat filter.
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
      await normalizeAudio(inputPaths[0], outputPath);
    } else {
      fs.copyFileSync(inputPaths[0], outputPath);
    }
    return;
  }

  if (type === "audio") {
    const normalizedPaths: string[] = [];
    const dir = path.dirname(outputPath);

    for (let i = 0; i < inputPaths.length; i++) {
      const normPath = path.join(dir, `norm-audio-${i}.wav`);
      await normalizeAudio(inputPaths[i], normPath);
      normalizedPaths.push(normPath);
    }

    const listPath = path.join(dir, "audio-list.txt");
    const listContent = normalizedPaths.map((p) => `file '${p}'`).join("\n");
    fs.writeFileSync(listPath, listContent, "utf-8");

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

  // Video concat filter
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
