import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const TTS_API_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";

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
      console.warn(`Cloud TTS (${voiceName}) failed:`, err?.error?.message || response.status);
    } catch (e) {
      console.warn(`Cloud TTS (${voiceName}) error:`, e instanceof Error ? e.message : e);
    }
  }

  return null;
}

/**
 * Generate a silent MP3 file of the given duration using FFmpeg.
 */
function generateSilence(durationSec: number): Buffer {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tts-silence-"));
  const outPath = path.join(tmpDir, "silence.mp3");

  try {
    execSync(
      `npx --yes @ffmpeg-installer/ffmpeg -f lavfi -i anullsrc=r=24000:cl=mono -t ${durationSec} -c:a libmp3lame -q:a 9 "${outPath}" -y`,
      { stdio: "pipe", timeout: 10000 },
    );
    return fs.readFileSync(outPath);
  } catch {
    // Absolute minimum fallback: tiny MP3 silence frame
    // This is a valid 0.026s MP3 frame (MPEG1 Layer3, 128kbps, 44100Hz, mono)
    return Buffer.from(
      "//uQxAAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV",
      "base64",
    );
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

  throw new Error(
    "קריינות לא זמינה. יש להפעיל את Google Cloud Text-to-Speech API בפרויקט Google Cloud שלך. " +
    "ניתן להפעיל בכתובת: https://console.cloud.google.com/apis/library/texttospeech.googleapis.com"
  );
}
