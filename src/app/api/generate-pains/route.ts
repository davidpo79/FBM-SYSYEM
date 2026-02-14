import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/claude";

const SYSTEM_PROMPT = `אתה מומחה בפסיכולוגיה שיווקית ובשיווק מבוסס תדר (FBM).
התפקיד שלך הוא לבצע ניתוח כאבים מעמיק של קהל היעד בנישה ספציפית, כדי ליצור בסיס לתוכן שיווקי שפוגע בנקודות הכאב האמיתיות.

אתה כותב בעברית, בשפה חדה ומדויקת שנכנסת לראש של קהל היעד.`;

const USER_PROMPT_TEMPLATE = `בהתבסס על מסמך האסטרטגיה והנישה שנבחרה, בצע ניתוח כאבים מעמיק.

=== מסמך אסטרטגיה ===
{STRATEGY}
=== סוף מסמך ===

=== נישה שנבחרה ===
{NICHE}
=== סוף נישה ===

כתוב ניתוח כאבים מקיף (מינימום 1500 מילים) שכולל:

## 1. 😰 כאבים שטחיים (Surface-Level Pains)
- 5 כאבים שהלקוח מודע אליהם ומדבר עליהם בקול
- עבור כל כאב: מה הלקוח אומר, מה הוא באמת מרגיש, ומה הביטוי בשפה שלו

## 2. 🔥 כאבים עמוקים (Deep Pains)
- 5 כאבים שהלקוח מרגיש אבל לא תמיד מבטא
- הפחדים הנסתרים, חוסר הביטחון, התסכולים האמיתיים
- מה מונע ממנו לישון בלילה

## 3. 💀 הכאב הקיומי (Existential Pain)
- הפחד העמוק ביותר שקשור לבעיה
- מה יקרה אם הוא לא יפתור את הבעיה
- התסריט הגרוע ביותר שהוא מדמיין

## 4. 🗣️ מילון הכאב (Pain Dictionary)
- 15 משפטים שהלקוח אומר לעצמו (בשפה שלו, לא מקצועית)
- 10 שאלות שהלקוח שואל בגוגל
- 5 תלונות שהוא כותב בקבוצות פייסבוק

## 5. 💡 נקודות המפנה (Trigger Points)
- 5 אירועים או רגעים שגורמים ללקוח להחליט "מספיק, אני צריך פתרון"
- מה הטריגר שמביא אותו לחפש עזרה

## 6. 🎯 הפתרון האידיאלי (בעיני הלקוח)
- מה הלקוח חולם שיקרה
- איך הוא מדמיין את החיים אחרי הפתרון
- מה ההבטחה שתגרום לו לפעול מיד

חשוב: כתוב כאילו אתה נכנס לראש של הלקוח. השתמש בשפה שלו, לא בשפה שיווקית.`;

export async function POST(req: NextRequest) {
  try {
    const { strategyDocument, selectedNiche } = await req.json();

    if (!strategyDocument || typeof strategyDocument !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid strategyDocument" },
        { status: 400 },
      );
    }

    if (!selectedNiche || typeof selectedNiche !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid selectedNiche" },
        { status: 400 },
      );
    }

    const userMessage = USER_PROMPT_TEMPLATE.replace(
      "{STRATEGY}",
      strategyDocument,
    ).replace("{NICHE}", selectedNiche);

    const painAnalysis = await callClaude(SYSTEM_PROMPT, userMessage);

    return NextResponse.json({ painAnalysis });
  } catch (error) {
    console.error("generate-pains error:", error);
    return NextResponse.json(
      { error: "Failed to generate pain analysis" },
      { status: 500 },
    );
  }
}
