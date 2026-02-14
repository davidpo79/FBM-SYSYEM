import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/claude";

const SYSTEM_PROMPT = `אתה מומחה בשיווק מבוסס תדר (FBM) ובזיהוי נישות שיווק.
התפקיד שלך הוא לנתח מסמך אסטרטגי של בעל עסק ולהמליץ על 3 נישות ספציפיות שמתאימות לו בצורה מושלמת.

אתה חייב להחזיר את התשובה בפורמט JSON בלבד, ללא טקסט נוסף.`;

const USER_PROMPT_TEMPLATE = `בהתבסס על מסמך האסטרטגיה הבא, זהה 3 נישות שיווק אידיאליות עבור בעל העסק.

=== מסמך אסטרטגיה ===
{STRATEGY}
=== סוף מסמך ===

עבור כל נישה, ספק:
1. **name** - שם הנישה (קצר וברור)
2. **score** - ציון התאמה מ-1 עד 10
3. **description** - תיאור קצר של הנישה (2-3 משפטים)
4. **why_perfect_match** - למה זו התאמה מושלמת עבורו (3-4 משפטים)
5. **target_audience** - מי קהל היעד הספציפי בנישה הזו
6. **pain_points** - 3 כאבים עיקריים של קהל היעד בנישה
7. **content_angles** - 3 זוויות תוכן מומלצות לנישה

החזר JSON בלבד בפורמט הזה:
{
  "niches": [
    {
      "name": "...",
      "score": 9,
      "description": "...",
      "why_perfect_match": "...",
      "target_audience": "...",
      "pain_points": ["...", "...", "..."],
      "content_angles": ["...", "...", "..."]
    }
  ]
}`;

export async function POST(req: NextRequest) {
  try {
    const { strategyDocument } = await req.json();

    if (!strategyDocument || typeof strategyDocument !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid strategyDocument" },
        { status: 400 },
      );
    }

    const userMessage = USER_PROMPT_TEMPLATE.replace(
      "{STRATEGY}",
      strategyDocument,
    );

    const result = await callClaude(SYSTEM_PROMPT, userMessage, 4000);

    // Parse the JSON response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse JSON from Claude response");
    }

    const niches = JSON.parse(jsonMatch[0]);

    return NextResponse.json(niches);
  } catch (error) {
    console.error("generate-niches error:", error);
    return NextResponse.json(
      { error: "Failed to generate niches" },
      { status: 500 },
    );
  }
}
