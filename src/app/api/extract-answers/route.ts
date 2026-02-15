import { GoogleGenAI } from "@google/genai";
import { getQuestions } from "@/lib/questions";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });

export async function POST(req: Request) {
  try {
    const { transcript, ownerName, ownerNiche } = await req.json();

    if (!transcript) {
      return Response.json({ error: "No transcript" }, { status: 400 });
    }

    const questions = getQuestions(ownerNiche);

    const prompt = `אתה מנתח שיחות עסקיות. קיבלת תמלול של שיחה עם "${ownerName || "בעל העסק"}"${ownerNiche ? ` (${ownerNiche})` : ""}.

להלן 10 שאלות שצריך לחלץ מתוך השיחה תשובות עבורן.

השאלות:
${questions.map((q, i) => `${i + 1}. [id: "${q.id}"] ${q.title}: ${q.text}`).join("\n\n")}

התמלול:
"""
${transcript}
"""

הוראות:
1. חלץ מהתמלול את התשובה הרלוונטית ביותר לכל שאלה
2. כתוב את התשובה בגוף ראשון, כאילו בעל העסק עצמו כותב
3. אם אין מספיק מידע לשאלה — כתוב "" (ריק)
4. דרג ביטחון 1-5 לכל תשובה
5. שפה טבעית וחמה

החזר JSON בלבד (בלי markdown backticks):
{
  "answers": { "1": "תשובה...", "2": "תשובה...", ... },
  "confidence": { "1": 4, "2": 5, ... },
  "summary": "סיכום קצר ב-2 משפטים"
}`;

    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Clean and parse JSON
    const clean = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(clean);

    return Response.json(parsed);
  } catch (error: unknown) {
    console.error("Extract error:", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Extraction failed",
      },
      { status: 500 },
    );
  }
}
