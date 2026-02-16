import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { logApiCall } from "@/lib/api-log";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { message, scriptText, currentHeadline, currentSubtitle, currentCta, niche } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const systemPrompt = `אתה מומחה קריאטיב ופרסום עם 15 שנות ניסיון בקמפיינים דיגיטליים מצליחים.
אתה מומחה בכתיבת כותרות, תתי-כותרות, וטקסטים ל-CTA שמניעים לפעולה ומביאים תוצאות מדהימות למשווקים.

הניסיון שלך כולל:
- ניהול קמפיינים של מיליונים בפייסבוק ואינסטגרם
- כתיבת קופי שמביא CTR גבוה ו-CPA נמוך
- התמחות בשיווק מבוסס תדר (FBM) ובנישות ספציפיות
- ידע מעמיק ב-A/B testing של כותרות ו-CTA

הנישה הנוכחית: ${niche || "לא צוינה"}
${scriptText ? `\nהתסריט הנוכחי:\n${scriptText}` : ""}
${currentHeadline ? `\nכותרת נוכחית: "${currentHeadline}"` : ""}
${currentSubtitle ? `\nתת-כותרת נוכחית: "${currentSubtitle}"` : ""}
${currentCta ? `\nCTA נוכחי: "${currentCta}"` : ""}

כללים:
- תמיד תן הצעה אחת מלאה שכוללת כותרת + הצעת פיילוט + CTA ביחד
- כל אפשרות צריכה להיות קצרה, חדה, וקליטה
- כותרות: עד 120 תווים, שורה-שתיים מקסימום. שורה ראשונה = שם הנישה, שורה שנייה = משפט חזק
- תתי-כותרות / הצעת פיילוט: עד 100 תווים, חייב לכלול הצעת פיילוט ב-500 ₪ — זו ההצעה שגורמת לאנשים ללחוץ
- CTA: עד 40 תווים, תמיד וריאציה של "שלח לי הודעה לתיאום שיחה"
- הסבר בקצרה למה כל אפשרות עובדת
- תן תשובות בעברית
- תתמקד בתוצאות למשווק — מה יביא הכי הרבה לידים ותגובות

חובה: תמיד תכתוב את ההצעה בפורמט הזה (עם גרשיים):
**כותרת:** "הטקסט כאן"
**הצעת פיילוט:** "הטקסט כאן"
**CTA:** "הטקסט כאן"
**הסבר:** למה זה עובד`;

    const result = await callAI(systemPrompt, message, 1500);

    logApiCall({
      endpoint: "/api/creative-chat",
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ success: true, reply: result });
  } catch (error) {
    console.error("creative-chat error:", error);
    logApiCall({
      endpoint: "/api/creative-chat",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown",
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
