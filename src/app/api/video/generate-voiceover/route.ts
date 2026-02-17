import { NextRequest, NextResponse } from "next/server";
import { logApiCall } from "@/lib/api-log";

const TTS_API_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { text, voice, speakingRate, pitch } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid text" },
        { status: 400 },
      );
    }

    const apiKey = process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google TTS API key not configured" },
        { status: 500 },
      );
    }

    // Hebrew Neural2 voices
    const voiceName = voice === "male" ? "he-IL-Neural2-B" : "he-IL-Neural2-A";

    const response = await fetch(`${TTS_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: "he-IL",
          name: voiceName,
        },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: speakingRate ?? 1.0,
          pitch: pitch ?? 0.0,
        },
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("TTS API error:", response.status, errData);

      // Fallback: try Wavenet voices if Neural2 fails
      const fallbackVoice = voice === "male" ? "he-IL-Wavenet-B" : "he-IL-Wavenet-A";
      const fallbackResponse = await fetch(`${TTS_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: "he-IL",
            name: fallbackVoice,
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: speakingRate ?? 1.0,
            pitch: pitch ?? 0.0,
          },
        }),
      });

      if (!fallbackResponse.ok) {
        // Last fallback: Standard voice
        const standardVoice = voice === "male" ? "he-IL-Standard-B" : "he-IL-Standard-A";
        const stdResponse = await fetch(`${TTS_API_URL}?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: { text },
            voice: {
              languageCode: "he-IL",
              name: standardVoice,
            },
            audioConfig: {
              audioEncoding: "MP3",
              speakingRate: speakingRate ?? 1.0,
              pitch: pitch ?? 0.0,
            },
          }),
        });

        if (!stdResponse.ok) {
          const stdErr = await stdResponse.json().catch(() => ({}));
          console.error("TTS Standard fallback error:", stdErr);
          return NextResponse.json(
            { error: "Failed to generate voice over. Make sure the Google Cloud Text-to-Speech API is enabled." },
            { status: 500 },
          );
        }

        const stdData = await stdResponse.json();
        logApiCall({ endpoint: "/api/video/generate-voiceover", status: "success", durationMs: Date.now() - startTime });
        return NextResponse.json({ audioContent: stdData.audioContent });
      }

      const fallbackData = await fallbackResponse.json();
      logApiCall({ endpoint: "/api/video/generate-voiceover", status: "success", durationMs: Date.now() - startTime });
      return NextResponse.json({ audioContent: fallbackData.audioContent });
    }

    const data = await response.json();

    logApiCall({
      endpoint: "/api/video/generate-voiceover",
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ audioContent: data.audioContent });
  } catch (error) {
    console.error("generate-voiceover error:", error);
    logApiCall({
      endpoint: "/api/video/generate-voiceover",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate voice over" },
      { status: 500 },
    );
  }
}
