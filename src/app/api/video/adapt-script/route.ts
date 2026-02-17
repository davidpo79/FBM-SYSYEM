import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { logApiCall } from "@/lib/api-log";

const ADAPTATION_PROMPT = (scriptText: string, niche: string) => `
אתה מומחה לייצור וידאו שיווקי.

משימה: המר את תסריט ה-FBM הבא לתסריט וידאו קצר של 60 שניות.
הסרטון מורכב מקליפי B-Roll (סטוק וידאו) עם Voice Over בעברית וכתוביות.

כללים:
- בדיוק 8 סצנות B-Roll (קצרות ודינמיות)
- כל סצנה 7-8 שניות (סה"כ ~60 שניות)
- פורמט 9:16 (portrait / רילס) — נחתך מ-landscape
- לכל סצנה: searchQuery — 2-4 מילות מפתח באנגלית לחיפוש סטוק וידאו (Pexels)
  * כשיש דמויות אנושיות בסצנה, הוסף "mediterranean" למילות החיפוש. דוגמאות: "mediterranean business owner office", "mediterranean woman shopping happy", "mediterranean man frustrated computer"
  * כשאין דמויות: "business growth chart", "modern office workspace", "money success celebration"
- לכל סצנה: visualDescription — תיאור ויזואלי קצר בעברית
- לכל סצנה: voiceOverText — טקסט קריינות בעברית, משפט אחד עד שניים קצרים
- הטקסט חייב להתאים לוויזואל
- סצנה ראשונה = Hook חזק שתופס תשומת לב
- סצנה אחרונה = CTA ברור
- שפה ישירה, רגשית, אנרגטית, קצבית

מבנה מומלץ (8 סצנות):
1. Hook (7s) — כאב/בעיה חזקה, תופס תשומת לב מיידית
2. אגיטציה (7s) — מחריף את הכאב
3. הזדהות (8s) — "גם אתה מכיר את זה..."
4. ציפייה (7s) — "תארו לעצמכם ש..."
5. פתרון (8s) — הצגת הפתרון/שיטה
6. הוכחה (7s) — תוצאות/מספרים
7. סמכות (8s) — למה אנחנו + הוכחה חברתית
8. CTA (8s) — הנעה לפעולה ברורה

התסריט המקורי:
${scriptText}

נישה: ${niche}

החזר JSON בלבד:
{
  "title": "כותרת הסרטון בעברית",
  "scenes": [
    {
      "number": 1,
      "duration": 7,
      "searchQuery": "mediterranean frustrated business owner desk",
      "visualDescription": "בעל עסק מתוסכל ליד המחשב",
      "voiceOverText": "טקסט קריינות בעברית",
      "notes": "Hook — תופס תשומת לב"
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

    let adaptedScript;
    try {
      adaptedScript = JSON.parse(result);
    } catch {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("adapt-script: No JSON found in response:", result.substring(0, 500));
        return NextResponse.json(
          { error: "Failed to parse AI response" },
          { status: 500 },
        );
      }
      let cleaned = jsonMatch[0];
      cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
      cleaned = cleaned.replace(/[\x00-\x1f]/g, (ch) =>
        ch === "\n" ? "\\n" : ch === "\r" ? "\\r" : ch === "\t" ? "\\t" : "",
      );
      adaptedScript = JSON.parse(cleaned);
    }

    if (!adaptedScript.scenes || !Array.isArray(adaptedScript.scenes)) {
      return NextResponse.json(
        { error: "Invalid response: missing scenes" },
        { status: 500 },
      );
    }

    // Normalize scenes
    adaptedScript.scenes = adaptedScript.scenes.map(
      (scene: Record<string, unknown>, i: number) => ({
        number: (scene.number as number) || i + 1,
        duration: (scene.duration as number) || 12,
        searchQuery: (scene.searchQuery as string) || "business professional",
        visualDescription: (scene.visualDescription as string) || "",
        voiceOverText: (scene.voiceOverText as string) || "",
        notes: (scene.notes as string) || "",
      }),
    );

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
