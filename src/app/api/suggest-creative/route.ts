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
   - city: עיר בלילה (אנרגיה עירונית, עסקים, דינמיות)
   - sunset: שקיעה (חום, רגש, שלווה מעצימה)
   - forest: יער (טבע, עומק, צמיחה אורגנית)
   - studio: סטודיו (פרימיום, מקצועיות, מוקפד)

4. **צבע מומלץ**:
   - gold: זהב #FFD700 (יוקרה, איכות, מצוינות)
   - teal: תכלת #00A3E0 (מקצועיות, אמינות, טכנולוגיה)

5. **Look & Feel** (תיאור קצר של האווירה החזותית):
   - חלץ מהתסריט את האווירה, הטון והתחושה
   - תאר ב-1-2 משפטים קצרים איזה look & feel מתאים לתמונה
   - דוגמה: "אווירה חמה ומקצועית עם תאורה דרמטית, מרגיש כמו ייעוץ VIP"

החזר JSON בלבד:
{
  "main_text": "כותרת ראשית בלבד - שורה עד שתיים",
  "cta": "שלחו הודעה",
  "background": "lighthouse|mountain|path|office|city|sunset|forest|studio",
  "color": "gold|teal",
  "reasoning": "הסבר קצר למה זה מתאים (1-2 משפטים)",
  "look_and_feel": "תיאור האווירה החזותית המומלצת"
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
