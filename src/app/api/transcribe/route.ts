import { GoogleGenAI } from "@google/genai";
import { logApiCall } from "@/lib/api-log";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return Response.json({ error: "No audio file" }, { status: 400 });
    }

    // Convert to base64
    const bytes = await audioFile.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: audioFile.type || "audio/webm",
                data: base64,
              },
            },
            {
              text: `תמלל את ההקלטה הזו לעברית. זו שיחה בין משווק לבעל עסק. תמלל מילה במילה, כולל הפסקות. פורמט: טקסט רגיל בלבד, בלי markdown.`,
            },
          ],
        },
      ],
    });

    const transcript =
      result.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    logApiCall({
      endpoint: "/api/transcribe",
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return Response.json({ transcript });
  } catch (error: unknown) {
    console.error("Transcription error:", error);

    logApiCall({
      endpoint: "/api/transcribe",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });

    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Transcription failed",
      },
      { status: 500 },
    );
  }
}
