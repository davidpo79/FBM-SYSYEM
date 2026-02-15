import { GoogleGenAI } from "@google/genai";
import { logApiCall } from "@/lib/api-log";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });

const SYSTEM_PROMPT = `אתה יועץ FBM (Frequency-Based Marketing) שמתמחה בזיהוי נישות אידיאליות.
אתה עוזר למשתמש לחשוב על נישות שמתאימות לתדר שלו — בדיאלוג חופשי, לא בהחלטה חד-צדדית.

## התפקיד שלך:
- לשאול שאלות מכוונות שעוזרות למשתמש לגלות בעצמו מי הקהל הכי נכון
- להציע נישות ולהסביר למה הן מתאימות לתדר שלו
- לאתגר חשיבה ולהציע זוויות שהמשתמש לא חשב עליהן
- כשהמשתמש מבקש הצעות — לתת 2-3 נישות חדשות עם הסבר קצר

## כללי חשוב:
- תשובות קצרות וממוקדות (3-5 פסקאות מקסימום)
- שפה חמה ומעודדת
- עברית בגובה העיניים
- אם המשתמש מסכים על נישה, הצע לו לבחור אותה

## כשאתה מציע נישה, השתמש בפורמט הזה:
**שם הנישה:** [שם ספציפי]
**ציון התאמה:** X/10
**למה מתאים:** [הסבר קצר]
**כאב מרכזי:** [הכאב שלהם]`;

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { message, history, strategyDocument } = await req.json();

    const contextPrompt = strategyDocument
      ? `${SYSTEM_PROMPT}\n\n=== מסמך האסטרטגיה של המשתמש (קיצור) ===\n${strategyDocument.slice(0, 3000)}\n===`
      : SYSTEM_PROMPT;

    const chatHistory = (history || [])
      .slice(-20)
      .map((msg: { role: string; content: string }) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }));

    const contents = [
      ...chatHistory,
      { role: "user", parts: [{ text: message }] },
    ];

    const stream = await ai.models.generateContentStream({
      model: "gemini-2.0-flash",
      contents,
      config: {
        systemInstruction: contextPrompt,
      },
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text =
              chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
            if (text) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`),
              );
            }
          }

          logApiCall({
            endpoint: "/api/brainstorm-niches",
            status: "success",
            durationMs: Date.now() - startTime,
          });

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`),
          );
          controller.close();
        } catch {
          logApiCall({
            endpoint: "/api/brainstorm-niches",
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
    console.error("brainstorm-niches error:", error);

    logApiCall({
      endpoint: "/api/brainstorm-niches",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });

    return Response.json(
      { error: error instanceof Error ? error.message : "Brainstorm failed" },
      { status: 500 },
    );
  }
}
