import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const { scriptText } = await req.json();

    if (!scriptText || typeof scriptText !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid scriptText" },
        { status: 400 },
      );
    }

    const response = await anthropic.messages.create({
      model: "claude-opus-4-20250514",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `
נתח את התסריט הזה:
"${scriptText}"

הצע תוכן ל-Creative (תמונה לפרסום):

1. **טקסט ראשי** (2-3 שורות, מקסימום 120 תווים):
   - חלץ את המסר המרכזי מהתסריט
   - צריך להיות קצר, חזק, וקליט
   - מתאים לפרסום ברשתות חברתיות

2. **CTA** (קריאה לפעולה, מקסימום 30 תווים):
   - חלץ מסוף התסריט
   - פעולה ברורה וקונקרטית

3. **רקע מומלץ**:
   - lighthouse: מגדלור (ניווט, ייעוץ, הדרכה)
   - mountain: הר (השראה, הישגים, צמיחה)
   - path: דרך מוארת (מסע, התקדמות)
   - office: משרד מודרני (מקצועיות, עסקים)

4. **צבע מומלץ**:
   - gold: זהב #FFD700 (יוקרה, איכות, מצוינות)
   - teal: תכלת #00A3E0 (מקצועיות, אמינות, טכנולוגיה)

החזר JSON בלבד:
{
  "main_text": "הטקסט הראשי המוצע (2-3 שורות)",
  "cta": "הCTA המוצע",
  "background": "lighthouse|mountain|path|office",
  "color": "gold|teal",
  "reasoning": "הסבר קצר למה זה מתאים (1-2 משפטים)"
}
`,
        },
      ],
    });

    const textBlock = response.content[0];
    if (textBlock.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse suggestion JSON");
    }

    const suggestion = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ success: true, suggestion });
  } catch (error) {
    console.error("suggest-creative error:", error);
    return NextResponse.json(
      { error: "Failed to generate suggestion" },
      { status: 500 },
    );
  }
}
