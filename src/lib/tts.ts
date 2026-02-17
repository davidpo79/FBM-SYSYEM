import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

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
 * Returns MP3 Buffer on success, null on failure.
 */
async function tryElevenLabsTTS(
  text: string,
  voice: "male" | "female",
  rate: number,
): Promise<Buffer | null> {
  const apiKey = process.env.ELEVEN_LABS_API_KEY;
  if (!apiKey) return null;

  const voiceId = ELEVENLABS_VOICES[voice];

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
      const err = await response.json().catch(() => ({}));
      const detail = err?.detail?.message || err?.detail || JSON.stringify(err);
      console.error(`ElevenLabs TTS failed [${response.status}]: ${detail}`);

      // If rate limited (429), log but don't retry
      if (response.status === 429) {
        console.warn("ElevenLabs rate limited - falling back to next TTS engine");
      }
      return null;
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    if (audioBuffer.length < 100) {
      console.warn("ElevenLabs returned too small audio:", audioBuffer.length);
      return null;
    }

    console.log(`ElevenLabs TTS success: ${audioBuffer.length} bytes for "${text.substring(0, 50)}..."`);
    return audioBuffer;
  } catch (e) {
    console.error("ElevenLabs TTS error:", e instanceof Error ? e.message : e);
    return null;
  }
}

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
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
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
      console.error(`Cloud TTS (${voiceName}) failed [${errCode}]: ${errMsg}`);
    } catch (e) {
      console.warn(`Cloud TTS (${voiceName}) error:`, e instanceof Error ? e.message : e);
    }
  }

  return null;
}

/**
 * Try Microsoft Edge TTS (free, no API key needed).
 * Returns MP3 Buffer on success, null on failure.
 */
async function tryEdgeTTS(
  text: string,
  voice: "male" | "female",
  rate: number,
): Promise<Buffer | null> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "edge-tts-"));
  try {
    const tts = new MsEdgeTTS();
    const voiceName = voice === "male" ? "he-IL-AvriNeural" : "he-IL-HilaNeural";
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const { audioFilePath } = await tts.toFile(tmpDir, text, { rate });

    tts.close();

    if (!fs.existsSync(audioFilePath)) {
      console.warn("Edge TTS: output file not found");
      return null;
    }

    const audioBuffer = fs.readFileSync(audioFilePath);
    if (audioBuffer.length < 100) {
      console.warn("Edge TTS returned too small audio:", audioBuffer.length);
      return null;
    }

    console.log(`Edge TTS success: ${audioBuffer.length} bytes for "${text.substring(0, 50)}..."`);
    return audioBuffer;
  } catch (e) {
    console.error("Edge TTS error:", e instanceof Error ? e.message : e);
    return null;
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
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
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const numSamples = sampleRate * durationSec;
    const dataSize = numSamples * numChannels * (bitsPerSample / 8);
    const buffer = Buffer.alloc(44 + dataSize);
    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write("WAVE", 8);
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
    buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    buffer.write("data", 36);
    buffer.writeUInt32LE(dataSize, 40);
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
 * Generate Hebrew TTS audio.
 * Pipeline: ElevenLabs → Google Cloud TTS → Microsoft Edge TTS → Silence fallback.
 */
export async function generateTTS(
  text: string,
  voice: "male" | "female" = "female",
  rate: number = 1.0,
  pitch: number = 0,
  durationFallbackSec: number = 10,
): Promise<TTSResult> {
  // 1. Try ElevenLabs (best quality, requires ELEVEN_LABS_API_KEY)
  const elevenResult = await tryElevenLabsTTS(text, voice, rate);
  if (elevenResult) {
    console.log("TTS: Using ElevenLabs");
    return { audioBuffer: elevenResult, usedTTS: true };
  }

  // 2. Try Google Cloud TTS (requires GOOGLE_TTS_API_KEY)
  const cloudResult = await tryCloudTTS(text, voice, rate, pitch);
  if (cloudResult) {
    console.log("TTS: Using Google Cloud TTS");
    return { audioBuffer: cloudResult, usedTTS: true };
  }

  // 3. Try Microsoft Edge TTS (free, no API key needed)
  const edgeResult = await tryEdgeTTS(text, voice, rate);
  if (edgeResult) {
    console.log("TTS: Using Microsoft Edge TTS");
    return { audioBuffer: edgeResult, usedTTS: true };
  }

  console.warn("All TTS engines failed - generating silence.");

  // 4. Fallback: generate silence matching scene duration
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
  const elevenResult = await tryElevenLabsTTS(text, voice, rate);
  if (elevenResult) {
    return elevenResult.toString("base64");
  }

  const cloudResult = await tryCloudTTS(text, voice, rate, pitch);
  if (cloudResult) {
    return cloudResult.toString("base64");
  }

  const edgeResult = await tryEdgeTTS(text, voice, rate);
  if (edgeResult) {
    return edgeResult.toString("base64");
  }

  throw new Error("קריינות לא זמינה - כל שירותי ה-TTS נכשלו. בדוק חיבור אינטרנט.");
}
