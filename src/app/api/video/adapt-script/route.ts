import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { logApiCall } from "@/lib/api-log";

const ADAPTATION_PROMPT = (scriptText: string, niche: string) => `
אתה מומחה לייצור וידאו ועריכת תוכן.

משימה: המר את התסריט הבא למבנה וידאו שמשלב:
1. B-Roll (תמונות AI או קטעי וידאו) - למקומות שבהם מדברים על נושאים כלליים
2. Selfie Video (צילום עצמי) - למקומות שבהם בעל העסק צריך לדבר ישירות למצלמה

כללים:
- התסריט מיועד לבעל עסק שיצלם את עצמו
- חלק תמיד את התסריט ל-5-8 סצנות
- כל סצנה צריכה להיות 10-20 שניות
- סמן בבירור איזה חלקים ל-B-Roll ואיזה ל-Selfie Video
- לכל B-Roll תן תיאור מפורט לתמונה באנגלית (עבור AI image generation)
- לכל Selfie Video תן את הטקסט המדויק שבעל העסק צריך לקרוא
- ל-B-Roll תן טקסט Voice Over בעברית שייקרא מעל התמונה

התסריט המקורי:
${scriptText}

נישה: ${niche}

פורמט התשובה (JSON בלבד, ללא טקסט נוסף):
{
  "scenes": [
    {
      "number": 1,
      "type": "b-roll",
      "duration": 15,
      "imagePrompt": "Detailed English description for AI image generation...",
      "voiceOverText": "הטקסט בעברית שייקרא ב-voice over...",
      "notes": "הערות למשתמש"
    },
    {
      "number": 2,
      "type": "selfie",
      "duration": 15,
      "teleprompterText": "הטקסט שבעל העסק יקרא למצלמה...",
      "notes": "הערות למשתמש"
    }
  ],
  "totalDuration": 90,
  "filmingInstructions": "הנחיות כלליות לצילום הסלפי-וידאו בעברית"
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
    const result = await callAI("", prompt);

    // Extract JSON from response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("adapt-script: No JSON found in response:", result.substring(0, 500));
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 },
      );
    }

    const adaptedScript = JSON.parse(jsonMatch[0]);

    // Validate structure
    if (!adaptedScript.scenes || !Array.isArray(adaptedScript.scenes)) {
      return NextResponse.json(
        { error: "Invalid response structure: missing scenes array" },
        { status: 500 },
      );
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
