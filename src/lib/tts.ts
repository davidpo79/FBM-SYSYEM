import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import type { WordTimestamp } from "./video-types";

const TTS_API_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";
const FFMPEG_PATH = ffmpegInstaller.path;

// ElevenLabs premade multilingual voices
const ELEVENLABS_VOICES = {
  female: "EXAVITQu4vr4xnSDxMaL", // Sarah
  male: "onwK4e9ZLuTAKqWW03F9",   // Daniel
};

// Track last failure reason for user-facing messages
let lastTTSFailureReason = "";

/** Small delay helper */
function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

/**
 * Try ElevenLabs TTS with retry on 429.
 * Uses turbo v2.5 model with Hebrew language code for best quality.
 */
async function tryElevenLabsTTS(
  text: string,
  voice: "male" | "female",
): Promise<{ buffer: Buffer; engine: string } | null> {
  const apiKey = process.env.ELEVEN_LABS_API_KEY;
  if (!apiKey) {
    console.log("ElevenLabs: ELEVEN_LABS_API_KEY not set, skipping");
    lastTTSFailureReason = "ELEVEN_LABS_API_KEY לא הוגדר ב-Vercel";
    return null;
  }

  const voiceId = ELEVENLABS_VOICES[voice];
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      const waitMs = 2000 * attempt; // 2s, 4s
      console.log(`ElevenLabs: Retry ${attempt}/${maxRetries} after ${waitMs}ms...`);
      await delay(waitMs);
    }

    try {
      const response = await fetch(
        `${ELEVENLABS_API_URL}/${voiceId}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_turbo_v2_5",
            language_code: "heb",
            voice_settings: {
              stability: 0.45,
              similarity_boost: 0.8,
              style: 0.2,
              use_speaker_boost: true,
            },
          }),
          signal: AbortSignal.timeout(30000),
        },
      );

      if (response.status === 429) {
        console.warn(`ElevenLabs: Rate limited (429), attempt ${attempt + 1}/${maxRetries}`);
        if (attempt < maxRetries - 1) continue; // retry
        lastTTSFailureReason = "ElevenLabs: חריגה ממגבלת בקשות (429)";
        return null;
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.error(`ElevenLabs failed [${response.status}]: ${errText}`);
        if (response.status === 401) {
          lastTTSFailureReason = `ElevenLabs: מפתח API לא תקין (401). ${errText.substring(0, 150)}`;
        } else if (response.status === 403) {
          lastTTSFailureReason = `ElevenLabs: אין הרשאה (403). ${errText.substring(0, 150)}`;
        } else {
          lastTTSFailureReason = `ElevenLabs: שגיאה [${response.status}]: ${errText.substring(0, 150)}`;
        }
        return null;
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      if (audioBuffer.length < 200) {
        console.warn("ElevenLabs: audio too small:", audioBuffer.length);
        lastTTSFailureReason = "ElevenLabs: תשובה ריקה מהשרת";
        return null;
      }

      console.log(`ElevenLabs SUCCESS: ${audioBuffer.length} bytes`);
      lastTTSFailureReason = "";
      return { buffer: audioBuffer, engine: "elevenlabs" };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("ElevenLabs error:", msg);
      lastTTSFailureReason = `ElevenLabs: ${msg.substring(0, 150)}`;
      return null;
    }
  }
  return null;
}

/**
 * Try ElevenLabs TTS with word-level timestamps (alignment) and retry on 429.
 * Uses the /with-timestamps endpoint.
 */
async function tryElevenLabsTTSWithTimestamps(
  text: string,
  voice: "male" | "female",
): Promise<{
  buffer: Buffer;
  engine: string;
  wordTimestamps: WordTimestamp[];
} | null> {
  const apiKey = process.env.ELEVEN_LABS_API_KEY;
  if (!apiKey) {
    console.log("ElevenLabs (timestamps): ELEVEN_LABS_API_KEY not set, skipping");
    lastTTSFailureReason = "ELEVEN_LABS_API_KEY לא הוגדר ב-Vercel";
    return null;
  }

  const voiceId = ELEVENLABS_VOICES[voice];
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      const waitMs = 2000 * attempt;
      console.log(`ElevenLabs (timestamps): Retry ${attempt}/${maxRetries} after ${waitMs}ms...`);
      await delay(waitMs);
    }

    try {
      const response = await fetch(
        `${ELEVENLABS_API_URL}/${voiceId}/with-timestamps?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_turbo_v2_5",
            language_code: "heb",
            voice_settings: {
              stability: 0.45,
              similarity_boost: 0.8,
              style: 0.2,
              use_speaker_boost: true,
            },
          }),
          signal: AbortSignal.timeout(30000),
        },
      );

      if (response.status === 429) {
        console.warn(`ElevenLabs (timestamps): Rate limited (429), attempt ${attempt + 1}/${maxRetries}`);
        if (attempt < maxRetries - 1) continue;
        lastTTSFailureReason = "ElevenLabs: חריגה ממגבלת בקשות (429)";
        return null;
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.error(`ElevenLabs timestamps failed [${response.status}]: ${errText}`);
        if (response.status === 401) {
          lastTTSFailureReason = `ElevenLabs: מפתח API לא תקין (401). ${errText.substring(0, 150)}`;
        } else if (response.status === 403) {
          lastTTSFailureReason = `ElevenLabs: אין הרשאה (403). ${errText.substring(0, 150)}`;
        } else {
          lastTTSFailureReason = `ElevenLabs: שגיאה [${response.status}]: ${errText.substring(0, 150)}`;
        }
        return null;
      }

      const data = await response.json();

      // Decode audio from base64
      const audioBase64 = data.audio_base64;
      if (!audioBase64) {
        console.warn("ElevenLabs timestamps: no audio_base64 in response");
        return null;
      }

      const audioBuffer = Buffer.from(audioBase64, "base64");
      if (audioBuffer.length < 200) {
        console.warn("ElevenLabs timestamps: audio too small:", audioBuffer.length);
        return null;
      }

      // Parse word-level alignment
      const wordTimestamps: WordTimestamp[] = [];
      const alignment = data.alignment;
      if (alignment?.characters && alignment?.character_start_times_seconds && alignment?.character_end_times_seconds) {
        const chars: string[] = alignment.characters;
        const starts: number[] = alignment.character_start_times_seconds;
        const ends: number[] = alignment.character_end_times_seconds;

        let currentWord = "";
        let wordStart = 0;
        let wordEnd = 0;

        for (let i = 0; i < chars.length; i++) {
          if (chars[i] === " " || i === chars.length - 1) {
            if (i === chars.length - 1 && chars[i] !== " ") {
              currentWord += chars[i];
              wordEnd = ends[i];
            }
            if (currentWord.trim()) {
              wordTimestamps.push({
                word: currentWord.trim(),
                start: wordStart,
                end: wordEnd,
              });
            }
            currentWord = "";
            wordStart = i + 1 < starts.length ? starts[i + 1] : 0;
          } else {
            if (currentWord === "") {
              wordStart = starts[i];
            }
            currentWord += chars[i];
            wordEnd = ends[i];
          }
        }
      }

      console.log(`ElevenLabs timestamps SUCCESS: ${audioBuffer.length} bytes, ${wordTimestamps.length} words`);
      return { buffer: audioBuffer, engine: "elevenlabs", wordTimestamps };
    } catch (e) {
      console.error("ElevenLabs timestamps error:", e instanceof Error ? e.message : e);
      return null;
    }
  }
  return null;
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
    // Manual WAV buffer
    const sampleRate = 24000;
    const numSamples = sampleRate * durationSec;
    const dataSize = numSamples * 2; // 16-bit mono
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
  failureReason?: string; // Why TTS failed (for user-facing messages)
}

/**
 * Generate Hebrew TTS audio.
 * Pipeline: ElevenLabs → Google Cloud TTS → Silence fallback.
 */
export async function generateTTS(
  text: string,
  voice: "male" | "female" = "female",
  rate: number = 1.0,
  pitch: number = 0,
  durationFallbackSec: number = 10,
): Promise<TTSResult> {
  console.log(`\n=== TTS for: "${text.substring(0, 60)}..." ===`);

  // 1. Try ElevenLabs (best quality)
  const elevenResult = await tryElevenLabsTTS(text, voice);
  if (elevenResult) {
    return { audioBuffer: elevenResult.buffer, usedTTS: true, engine: elevenResult.engine };
  }

  // 2. Try Google Cloud TTS
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
    failureReason: lastTTSFailureReason || "כל מנועי הקריינות נכשלו",
  };
}

/**
 * Generate Hebrew TTS audio WITH word-level timestamps.
 * Uses ElevenLabs /with-timestamps endpoint for precise subtitle sync.
 * Falls back to regular TTS if timestamps are not available.
 */
export async function generateTTSWithTimestamps(
  text: string,
  voice: "male" | "female" = "female",
  rate: number = 1.0,
  pitch: number = 0,
  durationFallbackSec: number = 10,
): Promise<TTSResult> {
  console.log(`\n=== TTS (with timestamps) for: "${text.substring(0, 60)}..." ===`);

  // 1. Try ElevenLabs with timestamps (best quality + sync data)
  const elevenResult = await tryElevenLabsTTSWithTimestamps(text, voice);
  if (elevenResult) {
    return {
      audioBuffer: elevenResult.buffer,
      usedTTS: true,
      engine: elevenResult.engine,
      wordTimestamps: elevenResult.wordTimestamps,
    };
  }

  // 2. Fall back to regular TTS (no timestamps)
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
      "קריינות לא זמינה - בדוק ELEVEN_LABS_API_KEY בהגדרות Vercel.",
  );
}
