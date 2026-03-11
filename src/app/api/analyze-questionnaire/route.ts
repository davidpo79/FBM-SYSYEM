import { GoogleGenAI } from "@google/genai";
import { getQuestions, type ProjectMode } from "@/lib/questions";
import { logApiCall } from "@/lib/api-log";

let _ai: GoogleGenAI | null = null;
function getAI() { return (_ai ??= new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! })); }

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const ownerName = (formData.get("ownerName") as string) || "";
    const ownerNiche = (formData.get("ownerNiche") as string) || "";
    const projectMode = (formData.get("projectMode") as string) || "client";

    if (!file) {
      return Response.json({ error: "לא הועלה קובץ" }, { status: 400 });
    }

    // Read file content
    let fileContent: string;
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
      fileContent = await file.text();
    } else if (fileName.endsWith(".pdf")) {
      // For PDF, send as base64 to Gemini which can read PDFs
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");

      const pdfResult = await getAI().models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: base64,
                },
              },
              { text: "חלץ את כל הטקסט מהמסמך הזה. החזר את הטקסט המלא בלבד, ללא הוספות." },
            ],
          },
        ],
      });

      fileContent = pdfResult.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } else if (fileName.endsWith(".docx") || fileName.endsWith(".doc")) {
      // For docx, send as base64 to Gemini
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const mimeType = fileName.endsWith(".docx")
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/msword";

      const docResult = await getAI().models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64,
                },
              },
              { text: "חלץ את כל הטקסט מהמסמך הזה. החזר את הטקסט המלא בלבד, ללא הוספות." },
            ],
          },
        ],
      });

      fileContent = docResult.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } else {
      // Try reading as text for any other format
      fileContent = await file.text();
    }

    if (!fileContent || fileContent.trim().length < 50) {
      return Response.json(
        { error: "לא הצלחנו לחלץ תוכן מהקובץ. ודא שהקובץ מכיל שאלון מלא." },
        { status: 400 }
      );
    }

    // Now extract answers from the questionnaire content
    const questions = getQuestions(ownerNiche, projectMode as ProjectMode | undefined);
    const hasNiche = ownerNiche && ownerNiche.trim() !== "";

    const contextLine = hasNiche
      ? `קיבלת שאלון מלא של "${ownerName || "בעל העסק"}" (${ownerNiche}).`
      : `קיבלת שאלון מלא של "${ownerName || "המשתמש"}".`;

    const prompt = `אתה מנתח שאלונים עסקיים למערכת שיווק FBM (Frequency Based Marketing).
${contextLine}

המשתמש העלה שאלון קיים שמלא בעבר. תפקידך לנתח את תוכן השאלון ולמפות את התשובות ל-10 השאלות של מערכת FBM.

להלן 10 השאלות שצריך למפות אליהן:
${questions.map((q, i) => `${i + 1}. [id: "${q.id}"] ${q.title}: ${q.text}`).join("\n\n")}

תוכן השאלון שהועלה:
"""
${fileContent.slice(0, 15000)}
"""

הוראות:
1. נתח את תוכן השאלון ומצא את התשובה הרלוונטית ביותר לכל אחת מ-10 השאלות
2. אם השאלון מכיל שאלות דומות — מפה אותן לשאלה המתאימה ביותר
3. כתוב את התשובות בגוף ראשון, בשפה טבעית וחמה
4. אם אין מידע מספיק לשאלה מסוימת — כתוב תשובה קצרה על סמך ההקשר הכללי, או "" אם באמת אין שום מידע
5. דרג ביטחון 1-5 לכל תשובה (5 = מידע ישיר מהשאלון, 3 = הסקה מההקשר, 1 = לא נמצא)
6. כתוב סיכום קצר ב-2 משפטים על מה שהבנת מהשאלון

החזר JSON בלבד (בלי markdown backticks):
{
  "answers": { "1": "תשובה...", "2": "תשובה...", ... },
  "confidence": { "1": 4, "2": 5, ... },
  "summary": "סיכום קצר ב-2 משפטים"
}`;

    const result = await getAI().models.generateContent({
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

    logApiCall({
      endpoint: "/api/analyze-questionnaire",
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return Response.json({
      ...parsed,
      documentText: fileContent.slice(0, 5000),
    });
  } catch (error: unknown) {
    console.error("Analyze questionnaire error:", error);

    logApiCall({
      endpoint: "/api/analyze-questionnaire",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });

    return Response.json(
      {
        error: error instanceof Error ? error.message : "שגיאה בניתוח השאלון",
      },
      { status: 500 }
    );
  }
}
