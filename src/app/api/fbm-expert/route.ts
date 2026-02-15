import { GoogleGenAI } from "@google/genai";
import { getFBMExpertSystemPrompt } from "@/lib/fbm-expert-prompt";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });

export async function POST(req: Request) {
  try {
    const { message, history, context } = await req.json();

    const systemPrompt = getFBMExpertSystemPrompt(context);

    // Build chat history (last 20 messages)
    const chatHistory = (history || [])
      .slice(-20)
      .map((msg: { role: string; content: string }) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }));

    // Stream response using generateContentStream
    const contents = [
      ...chatHistory,
      { role: "user", parts: [{ text: message }] },
    ];

    const stream = await ai.models.generateContentStream({
      model: "gemini-2.0-flash",
      contents,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          let fullText = "";
          for await (const chunk of stream) {
            const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
            if (text) {
              fullText += text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`),
              );
            }
          }

          // Generate follow-up questions
          let suggestions: string[] = [];
          try {
            const followUp = await ai.models.generateContent({
              model: "gemini-2.0-flash",
              contents: `בהתבסס על השיחה הבאה, הצע 3 שאלות המשך קצרות וממוקדות שהמשתמש יכול לשאול. החזר JSON בלבד: ["שאלה 1", "שאלה 2", "שאלה 3"]\n\nשיחה:\nמשתמש: ${message}\nמומחה: ${fullText.slice(0, 500)}`,
            });
            const sugText = (
              followUp.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
            )
              .replace(/```json\n?/g, "")
              .replace(/```\n?/g, "")
              .trim();
            suggestions = JSON.parse(sugText);
          } catch {
            suggestions = [];
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, suggestedQuestions: suggestions })}\n\n`,
            ),
          );
          controller.close();
        } catch {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "שגיאה בתשובה" })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    console.error("FBM Expert error:", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Expert failed",
      },
      { status: 500 },
    );
  }
}
