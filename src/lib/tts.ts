import { GoogleGenAI } from "@google/genai";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import type { WordTimestamp } from "./video-types";

const TTS_API_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";
const FFMPEG_PATH = ffmpegInstaller.path;

// Gemini TTS voices (auto-detect language, supports Hebrew)
const GEMINI_VOICES = {
  female: "Aoede",   // warm female
  male: "Charon",    // deep male
};

// Track last failure reason for user-facing messages
let lastTTSFailureReason = "";

/** Small delay helper */
function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

/**
 * Convert raw PCM (audio/L16, 24kHz, mono) to WAV buffer.
 */
function pcmToWav(pcmData: Buffer, sampleRate = 24000): Buffer {
  const dataSize = pcmData.length;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);       // fmt chunk size
  header.writeUInt16LE(1, 20);        // PCM format
  header.writeUInt16LE(1, 22);        // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); // byte rate
  header.writeUInt16LE(2, 32);        // block align
  header.writeUInt16LE(16, 34);       // bits per sample
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmData]);
}

/**
 * Try Gemini TTS (uses GOOGLE_AI_API_KEY — same key as Gemini/Veo).
 * Returns WAV audio buffer.
 */
async function tryGeminiTTS(
  text: string,
  voice: "male" | "female",
): Promise<{ buffer: Buffer; engine: string } | null> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.log("Gemini TTS: GOOGLE_AI_API_KEY not set, skipping");
    return null;
  }

  const voiceName = GEMINI_VOICES[voice];
  console.log(`Gemini TTS: trying voice ${voiceName} (${voice})...`);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!audioData?.data) {
      console.warn("Gemini TTS: no audio data in response");
      lastTTSFailureReason = "Gemini TTS: לא התקבל אודיו מהשרת";
      return null;
    }

    const pcmBuffer = Buffer.from(audioData.data, "base64");
    if (pcmBuffer.length < 200) {
      console.warn(`Gemini TTS: audio too small (${pcmBuffer.length}b)`);
      lastTTSFailureReason = "Gemini TTS: אודיו קטן מדי";
      return null;
    }

    // Convert PCM to WAV
    const wavBuffer = pcmToWav(pcmBuffer);
    console.log(`Gemini TTS SUCCESS [${voiceName}]: ${wavBuffer.length} bytes`);
    lastTTSFailureReason = "";
    return { buffer: wavBuffer, engine: `gemini-tts-${voiceName}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Gemini TTS error:", msg);
    if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
      lastTTSFailureReason = "Gemini TTS: חריגה ממגבלת בקשות. נסה שוב בעוד דקה.";
    } else {
      lastTTSFailureReason = `Gemini TTS: ${msg.substring(0, 150)}`;
    }
    return null;
  }
}

/**
 * Try Google Cloud TTS with Wavenet → Standard fallback.
 * Requires GOOGLE_TTS_API_KEY (separate from GOOGLE_AI_API_KEY).
 */
async function tryCloudTTS(
  text: string,
  voice: "male" | "female",
  rate: number,
  pitch: number,
): Promise<{ buffer: Buffer; engine: string } | null> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) {
    console.log("Google Cloud TTS: GOOGLE_TTS_API_KEY not set, skipping");
    return null;
  }

  const voiceNames = [
    voice === "male" ? "he-IL-Wavenet-B" : "he-IL-Wavenet-A",
    voice === "male" ? "he-IL-Standard-B" : "he-IL-Standard-A",
  ];

  for (const voiceName of voiceNames) {
    try {
      console.log(`Google TTS: trying ${voiceName}...`);
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
        signal: AbortSignal.timeout(15000),
      });

      if (response.ok) {
        const data = await response.json();
        const buf = Buffer.from(data.audioContent, "base64");
        console.log(`Google TTS SUCCESS (${voiceName}): ${buf.length} bytes`);
        return { buffer: buf, engine: `google-${voiceName}` };
      }

      const err = await response.json().catch(() => ({}));
      console.error(`Google TTS (${voiceName}) failed [${response.status}]:`, err?.error?.message || "unknown");
    } catch (e) {
      console.error(`Google TTS (${voiceName}) error:`, e instanceof Error ? e.message : e);
    }
  }

  return null;
}

/**
 * Generate a silent audio file of the given duration.
 */
function generateSilence(durationSec: number): Buffer {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tts-silence-"));
  const outPath = path.join(tmpDir, "silence.wav");

  try {
    execSync(
      `"${FFMPEG_PATH}" -f lavfi -i anullsrc=r=24000:cl=mono -t ${durationSec} -c:a pcm_s16le "${outPath}" -y`,
      { stdio: "pipe", timeout: 15000 },
    );
    return fs.readFileSync(outPath);
  } catch (e) {
    console.error("generateSilence FFmpeg failed:", e instanceof Error ? e.message : e);
    const sampleRate = 24000;
    const numSamples = sampleRate * durationSec;
    const dataSize = numSamples * 2;
    const buffer = Buffer.alloc(44 + dataSize);
    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write("WAVE", 8);
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write("data", 36);
    buffer.writeUInt32LE(dataSize, 40);
    return buffer;
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

export interface TTSResult {
  audioBuffer: Buffer;
  usedTTS: boolean;
  engine: string;
  wordTimestamps?: WordTimestamp[];
  failureReason?: string;
}

/**
 * Generate Hebrew TTS audio.
 * Pipeline: Gemini TTS → Google Cloud TTS → Silence.
 * Uses GOOGLE_AI_API_KEY (same key as Gemini/Veo — no extra cost).
 */
export async function generateTTS(
  text: string,
  voice: "male" | "female" = "female",
  rate: number = 1.0,
  pitch: number = 0,
  durationFallbackSec: number = 10,
): Promise<TTSResult> {
  console.log(`\n=== TTS for: "${text.substring(0, 60)}..." ===`);

  // 1. Try Gemini TTS (free with GOOGLE_AI_API_KEY)
  const geminiResult = await tryGeminiTTS(text, voice);
  if (geminiResult) {
    return { audioBuffer: geminiResult.buffer, usedTTS: true, engine: geminiResult.engine };
  }

  // 2. Try Google Cloud TTS (requires separate GOOGLE_TTS_API_KEY)
  const cloudResult = await tryCloudTTS(text, voice, rate, pitch);
  if (cloudResult) {
    return { audioBuffer: cloudResult.buffer, usedTTS: true, engine: cloudResult.engine };
  }

  console.warn("=== ALL TTS ENGINES FAILED - generating silence ===");
  console.warn(`Last failure reason: ${lastTTSFailureReason}`);

  // 3. Fallback: silence
  const silenceBuffer = generateSilence(durationFallbackSec);
  return {
    audioBuffer: silenceBuffer,
    usedTTS: false,
    engine: "silence",
    failureReason: lastTTSFailureReason || "כל מנועי הקריינות נכשלו. בדוק GOOGLE_AI_API_KEY.",
  };
}

/**
 * Generate Hebrew TTS audio WITH word-level timestamps.
 * Gemini TTS doesn't support timestamps, so falls back to regular TTS.
 */
export async function generateTTSWithTimestamps(
  text: string,
  voice: "male" | "female" = "female",
  rate: number = 1.0,
  pitch: number = 0,
  durationFallbackSec: number = 10,
): Promise<TTSResult> {
  // Gemini TTS doesn't provide word-level timestamps, use regular TTS
  return generateTTS(text, voice, rate, pitch, durationFallbackSec);
}

/**
 * Generate TTS and return base64 audio content (for preview endpoint).
 */
export async function generateTTSBase64(
  text: string,
  voice: "male" | "female" = "female",
  rate: number = 1.0,
  pitch: number = 0,
): Promise<string> {
  const result = await generateTTS(text, voice, rate, pitch);
  if (result.usedTTS) {
    return result.audioBuffer.toString("base64");
  }
  throw new Error(
    result.failureReason ||
      "קריינות לא זמינה - בדוק GOOGLE_AI_API_KEY בהגדרות Vercel.",
  );
}
