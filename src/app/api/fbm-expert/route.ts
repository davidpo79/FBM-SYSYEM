import { GoogleGenAI } from "@google/genai";
import { getFBMExpertSystemPrompt } from "@/lib/fbm-expert-prompt";
import { logApiCall } from "@/lib/api-log";
import { findRelevantContext } from "@/lib/embeddings";

let _ai: GoogleGenAI | null = null;
function getAI() { return (_ai ??= new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! })); }

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { message, history, context } = await req.json();

    // Use Gemini Embeddings to find the most relevant context sections
    let embeddingContext = "";
    if (context) {
      const docs: { name: string; content: string }[] = [];
      if (context.strategyDoc) docs.push({ name: "strategy", content: context.strategyDoc });
      if (context.niches) docs.push({ name: "niches", content: context.niches });
      if (context.pains) docs.push({ name: "pains", content: context.pains });
      if (context.scripts) docs.push({ name: "scripts", content: context.scripts });

      if (docs.length > 0) {
        try {
          const { context: relevantCtx } = await findRelevantContext(message, docs, 5);
          if (relevantCtx) {
            embeddingContext = `\n\n=== הקשר סמנטי רלוונטי (נמצא באמצעות Gemini Embedding) ===\n${relevantCtx}\n===`;
          }
        } catch (e) {
          console.warn("Embedding context search failed, falling back to standard context:", e instanceof Error ? e.message : e);
        }
      }
    }

    const systemPrompt = getFBMExpertSystemPrompt(context) + embeddingContext;

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

    const stream = await getAI().models.generateContentStream({
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
            const followUp = await getAI().models.generateContent({
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

          logApiCall({
            endpoint: "/api/fbm-expert",
            status: "success",
            durationMs: Date.now() - startTime,
          });

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, suggestedQuestions: suggestions })}\n\n`,
            ),
          );
          controller.close();
        } catch {
          logApiCall({
            endpoint: "/api/fbm-expert",
            status: "error",
            errorMessage: "Stream error",
            durationMs: Date.now() - startTime,
          });

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

    logApiCall({
      endpoint: "/api/fbm-expert",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });

    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Expert failed",
      },
      { status: 500 },
    );
  }
}
