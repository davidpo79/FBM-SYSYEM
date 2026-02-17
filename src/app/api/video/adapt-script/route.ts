import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { logApiCall } from "@/lib/api-log";

const ADAPTATION_PROMPT = (scriptText: string, niche: string) => `
אתה מומחה לייצור וידאו שיווקי ותסריטאי AI.

משימה: המר את תסריט ה-FBM הארוך הבא לתסריט וידאו קצר של 60 שניות.
הסרטון מופק לגמרי באמצעות AI — אין סלפי, אין צילום עצמי.
כל הסצנות הן B-Roll (קליפי וידאו AI) עם Voice Over בעברית.

כללים:
- בדיוק 5 סצנות B-Roll
- כל סצנה 10-14 שניות (סה"כ 60 שניות)
- פורמט 16:9 (landscape)
- לכל סצנה: תיאור ויזואלי מפורט באנגלית עבור AI video generation (Veo) בשדה imagePrompt
- לכל סצנה: תיאור ויזואלי בעברית לתצוגה בממשק בשדה imagePromptHe (תרגום עברי קצר של מה שרואים)
- לכל סצנה: טקסט Voice Over בעברית — מקסימום 2-3 משפטים קצרים וחזקים
- טקסט ה-VO חייב להתאים בצורה מושלמת לוויזואל — מה שרואים = מה ששומעים
- הסצנה הראשונה = hook חזק שתופס תשומת לב ב-3 שניות
- הסצנה האחרונה = CTA ברור עם הצעת פיילוט 500 ₪
- השתמש בשפה ישירה, רגשית, ובעלת אנרגיה גבוהה

מבנה מומלץ:
1. Hook (10s) — בעיה/כאב חזק שתופס תשומת לב
2. הזדהות (12s) — "גם אתה מרגיש ש..." + אגיטציה
3. פתרון (12s) — הצגת הפתרון/שיטה
4. הוכחה (12s) — תוצאות/מספרים/סמכות
5. CTA (14s) — הצעת פיילוט 500 ₪ + הנעה לפעולה

התסריט המקורי:
${scriptText}

נישה: ${niche}

החזר JSON בלבד עם המבנה הבא. חשוב: אל תשתמש בגרשיים כפולים בתוך ערכי טקסט, השתמש בגרש בודד במקום.

{
  "title": "כותרת הסרטון בעברית",
  "scenes": [
    {
      "number": 1,
      "type": "b-roll",
      "duration": 10,
      "imagePrompt": "Cinematic English description for Veo AI. Camera angle, lighting, subject, environment, mood.",
      "imagePromptHe": "תיאור ויזואלי בעברית של הסצנה",
      "voiceOverText": "טקסט קריינות בעברית",
      "notes": "הערות קצרות"
    }
  ],
  "totalDuration": 60
}
`;

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { scriptText, niche } = await req.json();

    if (!scriptText || typeof scriptText !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid scriptText" },
        { status: 400 },
      );
    }

    const prompt = ADAPTATION_PROMPT(scriptText, niche || "כללי");
    const result = await callAI("", prompt, 8000, { jsonMode: true });

    // Parse JSON response (Gemini JSON mode ensures valid JSON)
    let adaptedScript;
    try {
      adaptedScript = JSON.parse(result);
    } catch {
      // Fallback: try to extract JSON from response
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("adapt-script: No JSON found in response:", result.substring(0, 500));
        return NextResponse.json(
          { error: "Failed to parse AI response" },
          { status: 500 },
        );
      }
      // Clean common JSON issues: trailing commas, unescaped newlines
      let cleaned = jsonMatch[0];
      cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
      cleaned = cleaned.replace(/[\x00-\x1f]/g, (ch) =>
        ch === "\n" ? "\\n" : ch === "\r" ? "\\r" : ch === "\t" ? "\\t" : ""
      );
      adaptedScript = JSON.parse(cleaned);
    }

    // Validate structure
    if (!adaptedScript.scenes || !Array.isArray(adaptedScript.scenes)) {
      return NextResponse.json(
        { error: "Invalid response structure: missing scenes array" },
        { status: 500 },
      );
    }

    // Ensure all scenes are b-roll type and have required fields
    adaptedScript.scenes = adaptedScript.scenes.map((scene: Record<string, unknown>, i: number) => ({
      number: scene.number || i + 1,
      type: "b-roll" as const,
      duration: scene.duration || 12,
      imagePrompt: scene.imagePrompt || "",
      imagePromptHe: scene.imagePromptHe || "",
      voiceOverText: scene.voiceOverText || "",
      notes: scene.notes || "",
    }));

    // Ensure title exists
    if (!adaptedScript.title) {
      adaptedScript.title = "סרטון שיווקי";
    }

    logApiCall({
      endpoint: "/api/video/adapt-script",
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(adaptedScript);
  } catch (error) {
    console.error("adapt-script error:", error);
    logApiCall({
      endpoint: "/api/video/adapt-script",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to adapt script" },
      { status: 500 },
    );
  }
}
