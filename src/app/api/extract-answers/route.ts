import { GoogleGenAI } from "@google/genai";
import { getQuestions, type ProjectMode } from "@/lib/questions";
import { logApiCall } from "@/lib/api-log";

let _ai: GoogleGenAI | null = null;
function getAI() { return (_ai ??= new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! })); }

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const { transcript, ownerName, ownerNiche, projectMode } = await req.json();

    if (!transcript) {
      return Response.json({ error: "No transcript" }, { status: 400 });
    }

    const questions = getQuestions(ownerNiche, projectMode as ProjectMode | undefined);
    const hasNiche = ownerNiche && ownerNiche.trim() !== "";

    const contextLine = hasNiche
      ? `קיבלת תמלול של שיחה עם "${ownerName || "בעל העסק"}" (${ownerNiche}).`
      : `קיבלת תמלול של שיחה עם "${ownerName || "המשווק"}".`;

    const extractionInstruction = hasNiche
      ? `חלץ תשובות כאילו בעל העסק (${ownerNiche}) מדבר על עצמו (גוף ראשון). המשווק ממלא עבורו — תחלץ את מה שבעל העסק סיפר על עצמו.`
      : `חלץ תשובות כאילו המשווק עונה על עצמו (גוף ראשון).`;

    const prompt = `אתה מנתח שיחות עסקיות. ${contextLine}

להלן 10 שאלות שצריך לחלץ מתוך השיחה תשובות עבורן.

השאלות:
${questions.map((q, i) => `${i + 1}. [id: "${q.id}"] ${q.title}: ${q.text}`).join("\n\n")}

התמלול:
"""
${transcript}
"""

הוראות:
1. ${extractionInstruction}
2. חלץ מהתמלול את התשובה הרלוונטית ביותר לכל שאלה
3. כתוב את התשובה בגוף ראשון, שפה טבעית וחמה
4. אם אין מספיק מידע לשאלה — כתוב "" (ריק)
5. דרג ביטחון 1-5 לכל תשובה

החזר JSON בלבד (בלי markdown backticks):
{
  "answers": { "1": "תשובה...", "2": "תשובה...", ... },
  "confidence": { "1": 4, "2": 5, ... },
  "summary": "סיכום קצר ב-2 משפטים"
}`;

    const result = await getAI().models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Clean and parse JSON
    const clean = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(clean);

    logApiCall({
      endpoint: "/api/extract-answers",
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return Response.json(parsed);
  } catch (error: unknown) {
    console.error("Extract error:", error);

    logApiCall({
      endpoint: "/api/extract-answers",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });

    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Extraction failed",
      },
      { status: 500 },
    );
  }
}
