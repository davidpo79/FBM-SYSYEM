import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    // Auth check: require valid Bearer token
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { questionId, questionTitle, questionText, ideaName, existingAnswers } = await req.json();

    if (!questionTitle) {
      return NextResponse.json({ error: "Missing question" }, { status: 400 });
    }

    const context = existingAnswers
      ? Object.entries(existingAnswers)
          .filter(([, v]) => v && String(v).length > 5)
          .map(([k, v]) => `שאלה ${k}: ${v}`)
          .join("\n")
      : "";

    const prompt = `אתה עוזר ליזם ישראלי למלא שאלון GTM (Go-To-Market).
${ideaName ? `שם המיזם/רעיון: ${ideaName}` : ""}
${context ? `\nתשובות קודמות של היזם:\n${context}` : ""}

השאלה הנוכחית (מזהה: ${questionId}):
כותרת: ${questionTitle}
${questionText}

כתוב תשובה לדוגמה בעברית שהיזם יכול להשתמש בה כבסיס. התשובה צריכה להיות:
- ספציפית ומעשית (לא גנרית)
- בין 2-4 משפטים
- מבוססת על ההקשר שיש לך
- כתובה בגוף ראשון

החזר רק את התשובה עצמה, ללא הקדמה או הסבר.`;

    const answer = await callAI("", prompt, 500);

    return NextResponse.json({ answer: answer.trim() });
  } catch (error: unknown) {
    console.error("suggest-gtm-answer error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "שגיאה ביצירת תשובה" },
      { status: 500 },
    );
  }
}
