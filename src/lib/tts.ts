import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

const TTS_API_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";
const FFMPEG_PATH = ffmpegInstaller.path;

// ElevenLabs premade multilingual voices
const ELEVENLABS_VOICES = {
  female: "EXAVITQu4vr4xnSDxMaL", // Sarah
  male: "onwK4e9ZLuTAKqWW03F9",   // Daniel
};

/**
 * Try ElevenLabs TTS (best quality, requires ELEVEN_LABS_API_KEY).
 * Uses multilingual v2 model with Hebrew language code.
 */
async function tryElevenLabsTTS(
  text: string,
  voice: "male" | "female",
): Promise<{ buffer: Buffer; engine: string } | null> {
  const apiKey = process.env.ELEVEN_LABS_API_KEY;
  if (!apiKey) {
    console.log("ElevenLabs: ELEVEN_LABS_API_KEY not set, skipping");
    return null;
  }

  const voiceId = ELEVENLABS_VOICES[voice];
  console.log(`ElevenLabs: trying voice ${voiceId} (${voice})...`);

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
          model_id: "eleven_multilingual_v2",
          language_code: "he",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
        signal: AbortSignal.timeout(30000),
      },
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(`ElevenLabs failed [${response.status}]: ${errText}`);
      return null;
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    if (audioBuffer.length < 200) {
      console.warn("ElevenLabs: audio too small:", audioBuffer.length);
      return null;
    }

    console.log(`ElevenLabs SUCCESS: ${audioBuffer.length} bytes`);
    return { buffer: audioBuffer, engine: "elevenlabs" };
  } catch (e) {
    console.error("ElevenLabs error:", e instanceof Error ? e.message : e);
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
  engine: string; // which engine was used (for debugging)
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

  // 3. Fallback: silence
  const silenceBuffer = generateSilence(durationFallbackSec);
  return { audioBuffer: silenceBuffer, usedTTS: false, engine: "silence" };
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
  throw new Error("קריינות לא זמינה - בדוק ELEVEN_LABS_API_KEY בהגדרות Vercel.");
}
