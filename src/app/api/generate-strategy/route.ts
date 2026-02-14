import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/claude";

const SYSTEM_PROMPT = `אתה מומחה אסטרטגי בשיווק מבוסס תדר (Frequency-Based Marketing - FBM).
התפקיד שלך הוא לנתח את התשובות של בעל העסק ולבנות עבורו מסמך אסטרטגי מקיף שיהווה את הבסיס לכל הפרסום שלו בפייסבוק.

אתה כותב בעברית, בשפה חיה, ישירה ומקצועית. אתה לא כותב בסגנון "מאמר ויקיפדיה" אלא בסגנון של יועץ אסטרטגי שמדבר ישירות לבעל העסק.`;

const USER_PROMPT_TEMPLATE = `בהתבסס על התשובות הבאות של בעל העסק, כתוב מסמך אסטרטגיית FBM מקיף.

=== תשובות בעל העסק ===
{ANSWERS}
=== סוף תשובות ===

כתוב מסמך אסטרטגי מקיף (מינימום 3000 מילים) שכולל את הפרקים הבאים:

## 1. 🧬 פיצוח הזהות האמיתית (DNA של המותג)
- מה ה"למה" האמיתי של בעל העסק
- סיפור המקור שלו ואיך הוא מתחבר לעסק
- הערכים המרכזיים שמנחים אותו
- מה עושה אותו אותנטי וייחודי

## 2. 🎯 הלקוח האידיאלי (אווטאר מפורט)
- פרופיל דמוגרפי ופסיכוגרפי
- הכאבים, הפחדים והתסכולים העמוקים
- השפה שהלקוח משתמש בה
- מה הוא באמת רוצה (מעבר למוצר/שירות)
- מה עוצר אותו מלפעול

## 3. 💎 הצעת הערך הייחודית (USP)
- מה מבדל את בעל העסק מהמתחרים
- החוזקות הייחודיות שלו
- התוצאה הסופית שהוא מבטיח
- למה דווקא הוא הבחירה הנכונה

## 4. 🔥 אסטרטגיית קיטוב ומיצוב
- הדעות הלא פופולריות שלו
- נגד מה הוא נלחם בתעשייה
- סוג הלקוח שהוא דוחה (ולמה זה חשוב)
- איך הוא שונה מ"כולם"

## 5. 📣 מסרים מרכזיים וטון דיבור
- 5 מסרים מרכזיים לפרסום
- טון הדיבור המומלץ
- ביטויים ומשפטים שמאפיינים את המותג
- "כללי עשה ואל תעשה" בתוכן

## 6. 🏆 המורשת והחזון
- מה בעל העסק רוצה להשיג בטווח הרחוק
- איזו השפעה הוא רוצה להשאיר
- איך הוא רוצה שיזכרו אותו

חשוב: כתוב בגוף שני (פונה ישירות לבעל העסק), בשפה חיה ומעשית. כל פרק צריך לכלול insights מעמיקים, לא רק סיכום של מה שהוא כתב.`;

export async function POST(req: NextRequest) {
  try {
    const { answers } = await req.json();

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid answers" },
        { status: 400 },
      );
    }

    // Format answers for the prompt
    const formattedAnswers = answers
      .map(
        (a: { title: string; answer: string }) =>
          `**${a.title}:**\n${a.answer}`,
      )
      .join("\n\n");

    const userMessage = USER_PROMPT_TEMPLATE.replace(
      "{ANSWERS}",
      formattedAnswers,
    );

    const strategy = await callClaude(SYSTEM_PROMPT, userMessage);

    return NextResponse.json({ strategy });
  } catch (error) {
    console.error("generate-strategy error:", error);
    return NextResponse.json(
      { error: "Failed to generate strategy" },
      { status: 500 },
    );
  }
}
