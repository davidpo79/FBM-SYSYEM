import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { logApiCall } from "@/lib/api-log";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { niche, scriptText } = await req.json();

    if (!niche) {
      return NextResponse.json({ error: "Missing niche" }, { status: 400 });
    }

    // Detect gender from niche name
    const nicheStr = (niche || "").toLowerCase();
    let genderContext = "פנייה ברבים (גברים ונשים)";
    const feminineNiches = [
      "קוסמטיקאיות", "קוסמטיקאית", "מעצבות", "מעצבת", "מאפרות", "מאפרת",
      "נשים", "אמהות", "מטפלות", "מטפלת", "יועצות", "דיאטנית",
      "דיאטניות", "פסיכולוגית", "נטורופתית", "רפלקסולוגית",
      "מעצבת שיער", "מעצבות שיער", "בעלת", "בעלות",
      "מאמנת", "מאמנות", "יועצת",
    ];
    const masculineNiches = [
      "נגרים", "נגר", "שרברבים", "שרברב", "חשמלאים", "חשמלאי",
      "טכנאים", "טכנאי", "מנהלים", "גברים", "קבלנים", "קבלן",
      "מתכנתים", "מתכנת", "צלמים", "צלם", "אדריכלים", "אדריכל",
      "מאמנים", "מאמן", "יועצים", "יועץ",
    ];

    if (feminineNiches.some((w) => nicheStr.includes(w))) {
      genderContext = "פנייה בנקבה (את, שלך, רוצה, מרגישה)";
    } else if (masculineNiches.some((w) => nicheStr.includes(w))) {
      genderContext = "פנייה בזכר (אתה, שלך, רוצה, מרגיש)";
    }

    const prompt = `
אתה מומחה לבניית צ'אטבוטים לקמפייני מעורבות להודעות בפייסבוק (Messenger engagement campaigns).

הנישה: ${niche}
${scriptText ? `תסריט לרפרנס:\n"""\n${scriptText}\n"""` : ""}
מגדר הפנייה: ${genderContext}

צור תסריט צ'אטבוט לקמפיין מעורבות להודעות שמתאים לנישה.
זה צ'אטבוט שנשלח אוטומטית כתגובה פרטית למי שמגיב על מודעת פייסבוק.

מבנה הצ'אטבוט (5 שלבים):

**שלב 1 - הודעת פתיחה (תגובה אוטומטית לתגובה על המודעה):**
הודעה חמה ואישית שמאשרת שקיבלנו את ההודעה ומסבירה מה עומד לקרות.
כולל אימוג'י רלוונטי.

**שלב 2 - שאלת סינון (שאלה עם כפתורי בחירה):**
שאלה שעוזרת לסנן ולהבין את מצב הליד.
3 אפשרויות תשובה (כפתורים) שמתאימות לנישה.

**שלב 3 - תשובה לכל אפשרות + ערך:**
לכל אחת מ-3 האפשרויות — תשובה מותאמת שנותנת ערך ומכוונת לשלב הבא.
כלול טיפ מקצועי קצר שרלוונטי לתשובה.

**שלב 4 - הצעת ערך + CTA:**
הודעה שמציעה משהו בעל ערך (ייעוץ חינמי, בדיקה, הדגמה) ומבקשת פרטים לקביעת שיחה.
"שלחו לי הודעה ובואו נשוחח"

**שלב 5 - סגירה:**
הודעת תודה חמה ואישור שניצור קשר.

כללים:
- עברית
- ${genderContext}
- טון אישי, חם, מקצועי — לא מכירתי מדי
- כל הודעה 2-4 שורות מקסימום
- אימוג'ים מדודים (1-2 לכל הודעה)
- התאם את התוכן, השאלות, והדוגמאות ספציפית לנישה "${niche}"

החזר את הצ'אטבוט בפורמט הבא בדיוק:
---STEP1---
[טקסט הודעת פתיחה]
---STEP2---
[שאלת סינון]
---OPTION_A---
[טקסט כפתור א]
---OPTION_B---
[טקסט כפתור ב]
---OPTION_C---
[טקסט כפתור ג]
---REPLY_A---
[תשובה לאפשרות א]
---REPLY_B---
[תשובה לאפשרות ב]
---REPLY_C---
[תשובה לאפשרות ג]
---STEP4---
[הצעת ערך + CTA]
---STEP5---
[הודעת סגירה]
`;

    const result = await callAI("", prompt, 3000);

    // Parse the chatbot flow
    const flow = parseChatbotFlow(result.trim());

    logApiCall({
      endpoint: "/api/generate-chatbot",
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ success: true, flow, raw: result.trim() });
  } catch (error) {
    console.error("generate-chatbot error:", error);
    logApiCall({
      endpoint: "/api/generate-chatbot",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown",
      durationMs: Date.now() - startTime,
    });
    return NextResponse.json({ error: "Failed to generate chatbot" }, { status: 500 });
  }
}

function parseChatbotFlow(raw: string) {
  const getSection = (marker: string, nextMarkers: string[]): string => {
    const idx = raw.indexOf(marker);
    if (idx === -1) return "";
    const start = idx + marker.length;
    let end = raw.length;
    for (const nm of nextMarkers) {
      const ni = raw.indexOf(nm, start);
      if (ni !== -1 && ni < end) end = ni;
    }
    return raw.substring(start, end).trim();
  };

  return {
    step1: getSection("---STEP1---", ["---STEP2---"]),
    step2: getSection("---STEP2---", ["---OPTION_A---"]),
    optionA: getSection("---OPTION_A---", ["---OPTION_B---"]),
    optionB: getSection("---OPTION_B---", ["---OPTION_C---"]),
    optionC: getSection("---OPTION_C---", ["---REPLY_A---"]),
    replyA: getSection("---REPLY_A---", ["---REPLY_B---"]),
    replyB: getSection("---REPLY_B---", ["---REPLY_C---"]),
    replyC: getSection("---REPLY_C---", ["---STEP4---"]),
    step4: getSection("---STEP4---", ["---STEP5---"]),
    step5: getSection("---STEP5---", []),
  };
}
