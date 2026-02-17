import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

const TTS_API_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";
const FFMPEG_PATH = ffmpegInstaller.path;

/**
 * Try Google Cloud TTS with Neural2 → Wavenet → Standard fallback.
 * Returns MP3 Buffer on success, null on failure.
 */
async function tryCloudTTS(
  text: string,
  voice: "male" | "female",
  rate: number,
  pitch: number,
): Promise<Buffer | null> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return null;

  const voiceNames = [
    voice === "male" ? "he-IL-Neural2-B" : "he-IL-Neural2-A",
    voice === "male" ? "he-IL-Wavenet-B" : "he-IL-Wavenet-A",
    voice === "male" ? "he-IL-Standard-B" : "he-IL-Standard-A",
  ];

  for (const voiceName of voiceNames) {
    try {
      const response = await fetch(`${TTS_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: "he-IL", name: voiceName },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: rate ?? 1.0,
            pitch: pitch ?? 0.0,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return Buffer.from(data.audioContent, "base64");
      }

      const err = await response.json().catch(() => ({}));
      const errMsg = err?.error?.message || `HTTP ${response.status}`;
      const errCode = err?.error?.code || response.status;
      console.error(`Cloud TTS (${voiceName}) failed [${errCode}]: ${errMsg}`, JSON.stringify(err?.error || {}));
    } catch (e) {
      console.warn(`Cloud TTS (${voiceName}) error:`, e instanceof Error ? e.message : e);
    }
  }

  return null;
}

/**
 * Generate a silent MP3 file of the given duration using FFmpeg.
 * Uses the bundled ffmpeg binary from @ffmpeg-installer/ffmpeg.
 */
function generateSilence(durationSec: number): Buffer {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tts-silence-"));
  const outPath = path.join(tmpDir, "silence.mp3");

  try {
    execSync(
      `"${FFMPEG_PATH}" -f lavfi -i anullsrc=r=24000:cl=mono -t ${durationSec} -c:a libmp3lame -q:a 9 "${outPath}" -y`,
      { stdio: "pipe", timeout: 15000 },
    );
    return fs.readFileSync(outPath);
  } catch (e) {
    console.error("generateSilence failed:", e instanceof Error ? e.message : e);
    // Fallback: generate a valid WAV silence buffer manually
    // WAV header (44 bytes) + PCM silence data (24000 Hz * 1 channel * 2 bytes * duration)
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const numSamples = sampleRate * durationSec;
    const dataSize = numSamples * numChannels * (bitsPerSample / 8);
    const buffer = Buffer.alloc(44 + dataSize);
    // RIFF header
    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write("WAVE", 8);
    // fmt chunk
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20); // PCM
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
    buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    // data chunk
    buffer.write("data", 36);
    buffer.writeUInt32LE(dataSize, 40);
    // PCM data is already zero-filled (silence)
    return buffer;
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

export interface TTSResult {
  audioBuffer: Buffer;
  usedTTS: boolean; // true = real voice, false = silence fallback
}

/**
 * Generate Hebrew TTS audio. Falls back to silence if TTS APIs are unavailable.
 */
export async function generateTTS(
  text: string,
  voice: "male" | "female" = "female",
  rate: number = 1.0,
  pitch: number = 0,
  durationFallbackSec: number = 10,
): Promise<TTSResult> {
  // Try Google Cloud TTS
  const cloudResult = await tryCloudTTS(text, voice, rate, pitch);
  if (cloudResult) {
    return { audioBuffer: cloudResult, usedTTS: true };
  }

  console.warn("TTS unavailable - generating silence. Enable Google Cloud Text-to-Speech API for voice-over.");

  // Fallback: generate silence matching scene duration
  const silenceBuffer = generateSilence(durationFallbackSec);
  return { audioBuffer: silenceBuffer, usedTTS: false };
}

/**
 * Generate TTS and return base64 audio content (for preview endpoint).
 * Throws if TTS is completely unavailable.
 */
export async function generateTTSBase64(
  text: string,
  voice: "male" | "female" = "female",
  rate: number = 1.0,
  pitch: number = 0,
): Promise<string> {
  const cloudResult = await tryCloudTTS(text, voice, rate, pitch);
  if (cloudResult) {
    return cloudResult.toString("base64");
  }

  // Try to get the specific error for better feedback
  const apiKey = process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_TTS_API_KEY לא מוגדר. הוסף את המפתח בהגדרות Vercel.");
  }

  // One more attempt to get the exact error
  try {
    const testVoice = voice === "male" ? "he-IL-Standard-B" : "he-IL-Standard-A";
    const res = await fetch(`${TTS_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text: "test" },
        voice: { languageCode: "he-IL", name: testVoice },
        audioConfig: { audioEncoding: "MP3" },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `HTTP ${res.status}`);
    }
  } catch (e) {
    const detail = e instanceof Error ? e.message : "unknown";
    throw new Error(`שגיאת TTS: ${detail}`);
  }

  throw new Error("קריינות לא זמינה - בדוק שה-API key תקין ושה-Cloud Text-to-Speech API מופעל.");
}
