import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/claude";

const SYSTEM_PROMPT = `אתה קופירייטר מומחה בסרטוני וידאו לפייסבוק בשיטת FBM (Frequency-Based Marketing).
אתה יוצר תסריטים לסרטוני וידאו של 60-90 שניות שנועדו לפגוע בנקודות כאב ספציפיות ולמשוך את תשומת הלב של קהל היעד.

הסגנון שלך: ישיר, פוגעני (במובן הטוב), אותנטי, ללא בולשיט.
אתה כותב בעברית מדוברת, לא ספרותית.`;

const USER_PROMPT_TEMPLATE = `בהתבסס על מסמך האסטרטגיה וניתוח הכאבים, צור 3 תסריטי וידאו.

=== מסמך אסטרטגיה ===
{STRATEGY}
=== סוף מסמך ===

=== ניתוח כאבים ===
{PAINS}
=== סוף ניתוח ===

צור 3 תסריטי וידאו לפייסבוק, כל אחד 60-90 שניות (כ-150-200 מילים).

עבור כל תסריט כתוב:

### תסריט [מספר]: [שם התסריט]

**🎯 מטרה:** [מה התסריט בא להשיג]
**😰 כאב מרכזי:** [על איזה כאב הוא עובד]
**👥 קהל יעד:** [למי הוא מדבר]

**🎬 Hook (3 שניות ראשונות):**
[משפט פתיחה שעוצר את הגלילה]

**📝 גוף התסריט:**
[התסריט המלא, מחולק לפסקאות קצרות]
[כל פסקה = כ-10-15 שניות דיבור]
[סימון [הפסקה] בין חלקים]

**📢 CTA (קריאה לפעולה):**
[מה אנחנו רוצים שהצופה יעשה]

**🎭 הנחיות ביצוע:**
- טון: [איך לדבר]
- רקע: [איפה לצלם]
- טיפ: [טיפ ספציפי לביצוע]

---

כללים חשובים:
1. ה-Hook חייב לעצור את הגלילה - משפט מפתיע, פרובוקטיבי, או שמדבר ישירות לכאב
2. לא למכור ישירות - ליצור חיבור, אמון, סקרנות
3. לדבר בשפה של קהל היעד, לא בשפה שיווקית
4. כל תסריט צריך לעבוד על כאב אחר
5. התסריט חייב להרגיש כמו שיחה, לא כמו מודעה
6. לכלול רגעי "אני מכיר את זה" שגורמים לצופה להזדהות`;

export async function POST(req: NextRequest) {
  try {
    const { strategyDocument, painAnalysis } = await req.json();

    if (!strategyDocument || typeof strategyDocument !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid strategyDocument" },
        { status: 400 },
      );
    }

    if (!painAnalysis || typeof painAnalysis !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid painAnalysis" },
        { status: 400 },
      );
    }

    const userMessage = USER_PROMPT_TEMPLATE.replace(
      "{STRATEGY}",
      strategyDocument,
    ).replace("{PAINS}", painAnalysis);

    const scripts = await callClaude(SYSTEM_PROMPT, userMessage);

    return NextResponse.json({ scripts });
  } catch (error) {
    console.error("generate-scripts error:", error);
    return NextResponse.json(
      { error: "Failed to generate scripts" },
      { status: 500 },
    );
  }
}
