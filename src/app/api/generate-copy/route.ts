import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { logApiCall } from "@/lib/api-log";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { scriptText, niche, mainText, cta } = await req.json();

    if (!scriptText) {
      return NextResponse.json({ error: "Missing scriptText" }, { status: 400 });
    }

    // Detect gender from niche name for proper Hebrew language
    const nicheStr = (niche || "").toLowerCase();
    let genderInstruction = "דבר בלשון רבים (פנייה מעורבת לגברים ונשים).";
    // Feminine niches
    const feminineNiches = [
      "קוסמטיקאיות", "קוסמטיקאית", "מעצבות", "מעצבת", "מאפרות", "מאפרת",
      "נשים", "אמהות", "מטפלות", "מטפלת", "מנהלות", "יועצות", "דיאטנית",
      "דיאטניות", "פסיכולוגית", "נטורופתית", "רפלקסולוגית", "קליניקאית",
      "מעצבת שיער", "מעצבות שיער", "מעצבת פנים", "בעלת", "בעלות",
      "מאמנת", "מאמנות", "יועצת",
    ];
    // Masculine niches
    const masculineNiches = [
      "נגרים", "נגר", "שרברבים", "שרברב", "חשמלאים", "חשמלאי",
      "טכנאים", "טכנאי", "מנהלים", "גברים", "קבלנים", "קבלן",
      "מתכנתים", "מתכנת", "צלמים", "צלם", "אדריכלים", "אדריכל",
      "מאמנים", "מאמן", "יועצים", "יועץ",
    ];

    if (feminineNiches.some((w) => nicheStr.includes(w))) {
      genderInstruction = "דברי בלשון נקבה (פנייה לנשים — את, שלך, רוצה, מרגישה).";
    } else if (masculineNiches.some((w) => nicheStr.includes(w))) {
      genderInstruction = "דבר בלשון זכר (פנייה לגברים — אתה, שלך, רוצה, מרגיש).";
    }

    const prompt = `
אתה קופירייטר מומחה לפרסום ברשתות חברתיות, מתמחה בשיטת FBM (Frequency Based Marketing — שיווק מבוסס תדר).

נתון לך תסריט וידאו:
"""
${scriptText}
"""

${niche ? `הנישה: ${niche}` : ""}
${mainText ? `כותרת הקריאייטיב: ${mainText}` : ""}
${cta ? `CTA: ${cta}` : ""}

כתוב **קופי למודעת פייסבוק** — זה הטקסט שמופיע מעל/מתחת לתמונה בפוסט הפרסומי (לא על התמונה עצמה).

חשוב מאוד — התאמת לשון למגדר:
${genderInstruction}
התאם את כל הפנייה בקופי ללשון הנכונה בהתאם לנישה.

כללים:
1. **Hook** (שורה ראשונה) — חייבת לעצור גלילה. שאלה ישירה, טענה מפתיעה, או הזדהות עם כאב.
2. **גוף** — 3-5 שורות שמעמיקות את הכאב, מציגות את הפתרון, ומבססות אמון. שפה פשוטה וישירה.
3. **CTA** — הקופי חייב להסתיים עם קריאה לפעולה שמסתיימת ב: "שלחו לי הודעה ובואו נשוחח 💬" (תמיד לסיים בדיוק עם המשפט הזה).
4. הקופי חייב להתבסס ישירות על התסריט — אותו מסר, אותו טון, אותו קהל יעד.
5. אורך: 150-250 מילים
6. אימוג'ים: 2-4 בסך הכל, מדודים
7. עברית
8. שורת רווח בין פסקאות (לקריאות בפייסבוק)
9. בלי hashtags
10. בלי "לינק בביו" או הפניות לאתרים

החזר את הקופי בלבד, בלי הסברים.
`;

    const result = await callAI("", prompt, 2000);

    logApiCall({
      endpoint: "/api/generate-copy",
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ success: true, copy: result.trim() });
  } catch (error) {
    console.error("generate-copy error:", error);
    logApiCall({
      endpoint: "/api/generate-copy",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown",
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json({ error: "Failed to generate copy" }, { status: 500 });
  }
}
