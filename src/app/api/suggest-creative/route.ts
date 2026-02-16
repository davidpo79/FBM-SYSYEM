import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { logApiCall } from "@/lib/api-log";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
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
   - שורה ראשונה: שם הנישה/תפקיד (למשל "יועץ משכנתאות", "מאמן כושר")
   - שורה שנייה: משפט חזק וקליט מהתסריט
   - דוגמה טובה: "יועץ משכנתאות\nהגיע הזמן לשנות את התדר."
   - דוגמה רעה: "מרגישים שהייעוץ הקריירסטי שלכם פונה לכולם אבל לא מגיע לאף אחד? הגיע הזמן למצוא את הנישה שלכם. יועצי קריירה עצמאיים גילאי 28-38"

2. **תת-כותרת / הצעת פיילוט** (עד 100 תווים):
   - זו ההצעה המרכזית שגורמת לאנשים ללחוץ על המודעה!
   - חייב לכלול הצעת פיילוט של 500 ₪ — זו הצעה שאי אפשר לסרב לה
   - המשפט צריך להסביר למה כדאי לנצל את ההצעה עכשיו
   - דוגמאות:
     * "פיילוט ב-500 ₪ בלבד. גלה איך להגיע ללקוחות המדויקים לפני כולם."
     * "התחל עם פיילוט ב-500 ₪. אל תילחם על שאריות — קבל לידים מדויקים."
     * "ב-500 ₪ בלבד תקבל קמפיין ממוקד שמביא לידים חמים מהיום הראשון."
   - זהו הטקסט שמופיע באמצע התמונה בצבע זהב — הוא צריך להיות משכנע ומפתה

3. **CTA** (קריאה לפעולה, מקסימום 40 תווים):
   - ה-CTA תמיד צריך להיות וריאציה של "שלחו הודעה" - לדוגמה: "שלח לי הודעה לתיאום שיחה", "שלח הודעה לפרטים", "שלחו הודעה עכשיו".
   - אל תציע CTA אחר כמו "צרו קשר" או "התקשרו".
   - ברירת מחדל: "שלח לי הודעה לתיאום שיחה"

4. **רקע מומלץ**:
   - lighthouse: מגדלור (ניווט, ייעוץ, הדרכה)
   - mountain: הר (השראה, הישגים, צמיחה)
   - path: דרך מוארת (מסע, התקדמות)
   - office: משרד מודרני (מקצועיות, עסקים)
   - city: עיר בלילה (אנרגיה עירונית, עסקים, דינמיות)
   - sunset: שקיעה (חום, רגש, שלווה מעצימה)
   - forest: יער (טבע, עומק, צמיחה אורגנית)
   - studio: סטודיו (פרימיום, מקצועיות, מוקפד)

5. **צבע מומלץ**:
   - gold: זהב #FFD700 (יוקרה, איכות, מצוינות)
   - teal: תכלת #00A3E0 (מקצועיות, אמינות, טכנולוגיה)

6. **Look & Feel** (תיאור קצר של האווירה החזותית):
   - חלץ מהתסריט את האווירה, הטון והתחושה
   - תאר ב-1-2 משפטים קצרים איזה look & feel מתאים לתמונה
   - דוגמה: "אווירה חמה ומקצועית עם תאורה דרמטית, מרגיש כמו ייעוץ VIP"

7. **Image Prompt** (הנחיה באנגלית ל-AI שייצר את תמונת הרקע):
   ⚠️ חשוב מאד: התמונה היא רקע בלבד — אסור לשים טקסט, כיתובים, אותיות, או מילים כלשהן על התמונה!
   הרקע הוא האלמנט הכי חשוב — תיעדוף אותו מעל כל דבר אחר בעיצוב.

   - כתוב באנגלית prompt מפורט ומקצועי ל-text-to-image AI
   - ה-PROMPT חייב להתבסס על תוכן התסריט עצמו:
     * מי קהל היעד? (גיל, מקצוע, מגדר) → תאר דמות מתאימה בתמונה
     * מה המסר המרכזי? → בנה סצנה ויזואלית שמבטאת את המסר
     * מה הטון? (אמפתי, מעצים, דרמטי) → התאם תאורה ואווירה
     * מה הנישה? → הוסף אלמנטים סימבוליים רלוונטיים
   - ⚠️ הרקע חייב להיות מדויק — אם יש בתסריט תיאור ספציפי (כמו מגדלור שמאיר על קבוצת אנשים), חובה לשחזר את הסצנה הזו במדויק. כל אלמנט שמוזכר חייב להופיע.
   - המבנה של כל image_prompt:
     1. SCENE: תיאור הסצנה — מה קורה, מי שם, איפה (זה הכי חשוב!)
     2. SUBJECT: תיאור הדמות המרכזית — גיל, מראה, תנוחה, ביטוי
     3. BACKGROUND: מה מאחורי הדמות — נוף, עיר, טבע (תיעדוף מקסימלי!)
     4. LIGHTING: סוג תאורה — golden hour, dramatic, rim light, god rays
     5. ATMOSPHERE: אפקטים — ערפל, אבק, גשם, חלקיקי אור
     6. COMPOSITION: TOP 30% darker for headline overlay, BOTTOM 20% darker for CTA overlay
     7. QUALITY: Ultra-realistic, 8K, cinematic color grading, professional advertising
     8. CRITICAL: ABSOLUTELY NO TEXT, NO TYPOGRAPHY, NO LETTERS, NO WORDS, NO CAPTIONS on the image. Pure background only.
   - דוגמאות לפי נישות:
     * יועץ משכנתאות: "Young couple standing on hill overlooking modern city at golden hour, glowing holographic house outline floating before them. Warm golden god rays, construction cranes in background. Aspirational atmosphere. ABSOLUTELY NO TEXT OR TYPOGRAPHY."
     * מאמן כושר: "Athlete silhouette at peak of stadium stairs at sunrise. Volumetric light through stadium structure. Sweat particles in golden backlight. Motivational atmosphere. ABSOLUTELY NO TEXT OR TYPOGRAPHY."
     * עורך דין: "Confident professional standing at floor-to-ceiling office window, city skyline at night, dramatic rim lighting. Scales of justice subtle reflection in glass. ABSOLUTELY NO TEXT OR TYPOGRAPHY."
     * שיפוצניק: "Craftsman standing on rooftop of renovated building, overlooking glowing city at sunset. Strong golden backlight, heroic rim light. He is calm and confident, not working. ABSOLUTELY NO TEXT OR TYPOGRAPHY."
     * מעצבת פנים: "Stunning transformed living room with dramatic before/after lighting. One half dark and cluttered, other half bright luxurious modern design. Magical transformation. ABSOLUTELY NO TEXT OR TYPOGRAPHY."
   - הPrompt חייב להיות לפחות 100 מילים באנגלית
   - חייב לכלול: subject + scene + lighting + atmosphere + composition instructions + quality
   - חובה לסיים כל prompt עם: "ABSOLUTELY NO TEXT, NO TYPOGRAPHY, NO LETTERS, NO WORDS ON THE IMAGE. Pure visual background only."

החזר JSON בלבד:
{
  "main_text": "שם הנישה\\nמשפט חזק וקליט",
  "pilot_subtitle": "פיילוט ב-500 ₪ בלבד. משפט משכנע שמסביר למה כדאי.",
  "cta": "שלח לי הודעה לתיאום שיחה",
  "background": "lighthouse|mountain|path|office|city|sunset|forest|studio",
  "color": "gold|teal",
  "reasoning": "הסבר קצר למה זה מתאים (1-2 משפטים)",
  "look_and_feel": "תיאור האווירה החזותית המומלצת",
  "image_prompt": "Detailed English prompt for image generation AI (at least 100 words)..."
}
`;

    const result = await callAI("", prompt, 1200);

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse suggestion JSON");
    }

    const suggestion = JSON.parse(jsonMatch[0]);

    logApiCall({
      endpoint: "/api/suggest-creative",
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ success: true, suggestion });
  } catch (error) {
    console.error("suggest-creative error:", error);

    logApiCall({
      endpoint: "/api/suggest-creative",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(
      { error: "Failed to generate suggestion" },
      { status: 500 },
    );
  }
}
