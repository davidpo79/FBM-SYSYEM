import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const { scriptText } = await req.json();

    if (!scriptText || typeof scriptText !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid scriptText" },
        { status: 400 },
      );
    }

    const prompt = `
נתח את התסריט הזה:
"${scriptText}"

הצע תוכן ל-Creative (תמונה לפרסום):

1. **טקסט ראשי** (שורה אחת עד שתיים מקסימום, עד 120 תווים):
   - חלץ את המסר המרכזי מהתסריט
   - צריך להיות קצר, חזק, וקליט - כותרת בלבד!
   - מתאים לפרסום ברשתות חברתיות
   - הטקסט הראשי חייב להיות כותרת בלבד - שורה עד שתיים מקסימום. אסור להוסיף הגדרת קהל יעד, הסבר על הנישה, או משפטים נוספים.
   - דוגמה טובה: "יועץ משכנתאות\nהגיע הזמן לשנות את התדר."
   - דוגמה רעה: "מרגישים שהייעוץ הקריירסטי שלכם פונה לכולם אבל לא מגיע לאף אחד? הגיע הזמן למצוא את הנישה שלכם. יועצי קריירה עצמאיים גילאי 28-38"

2. **CTA** (קריאה לפעולה, מקסימום 30 תווים):
   - ה-CTA תמיד צריך להיות וריאציה של "שלחו הודעה" - לדוגמה: "שלחו הודעה", "שלח לי הודעה", "שלחו הודעה עכשיו".
   - אל תציע CTA אחר כמו "צרו קשר" או "התקשרו".
   - ברירת מחדל: "שלחו הודעה"

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
  "main_text": "כותרת ראשית בלבד - שורה עד שתיים",
  "cta": "שלחו הודעה",
  "background": "lighthouse|mountain|path|office",
  "color": "gold|teal",
  "reasoning": "הסבר קצר למה זה מתאים (1-2 משפטים)"
}
`;

    const result = await callAI("", prompt, 1000);

    const jsonMatch = result.match(/\{[\s\S]*\}/);
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
