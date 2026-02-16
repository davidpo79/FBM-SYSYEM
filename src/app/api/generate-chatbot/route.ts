import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { logApiCall } from "@/lib/api-log";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { niche, ownerGender, audienceGender } = await req.json();

    if (!niche) {
      return NextResponse.json({ error: "Missing niche" }, { status: 400 });
    }

    // Generate niche-specific experience description using AI
    const prompt = `
הנישה: ${niche}

כתוב משפט אחד קצר שמתאר ניסיון מקצועי בעבודה עם קהל הנישה הזו.
המשפט צריך להתחיל ב"יש לי ניסיון רב ב" ולהמשיך עם תיאור ספציפי של התחום.

דוגמאות:
- נישה "יועצות זוגיות" → "יש לי ניסיון רב בליווי זוגות ונשים והתמחות במשברים מורכבים וצמיחה אישית וזוגית"
- נישה "קוסמטיקאיות" → "יש לי ניסיון רב בעבודה עם קוסמטיקאיות ובניית אסטרטגיית שיווק שמביאה לקוחות חדשים בקביעות"
- נישה "נגרים" → "יש לי ניסיון רב בעבודה עם נגרים ובעלי מלאכה ויצירת זרם קבוע של פניות מלקוחות איכותיים"
- נישה "רופאי שיניים" → "יש לי ניסיון רב בשיווק לקליניקות שיניים ויצירת תהליך שמביא מטופלים חדשים באופן עקבי"

החזר רק את המשפט, בלי הסברים.
`;

    const nicheDescription = await callAI("", prompt, 200);

    // Build the chatbot messages based on gender selections
    // ownerGender: "male" | "female"
    // audienceGender: "male" | "female" | "all"
    const og = ownerGender || "male";
    const ag = audienceGender || "all";

    // Owner gender forms
    const ownerOfferVerb = og === "female" ? "מציעה" : "מציע";
    const ownerPreferVerb = og === "female" ? "מעדיפה" : "מעדיף";

    // Audience gender forms
    let audienceCanVerb: string; // שתוכל / שתוכלי / שתוכלו
    let audienceInterest: string; // מעניין אותך / מעניין אותך / מעניין אותכם
    let audienceGiveYou: string; // שאתן לך / שאתן לך / שאתן לכם
    let audienceYourSituation: string; // את המצב שלך / את המצב שלך / את המצב שלכם
    let audienceCheck: string; // לבחון / לבחון / לבחון

    if (ag === "female") {
      audienceCanVerb = "שתוכלי";
      audienceInterest = "מעניין אותך";
      audienceGiveYou = "שאתן לך";
      audienceYourSituation = "את המצב שלך";
      audienceCheck = "לבחון";
    } else if (ag === "male") {
      audienceCanVerb = "שתוכל";
      audienceInterest = "מעניין אותך";
      audienceGiveYou = "שאתן לך";
      audienceYourSituation = "את המצב שלך";
      audienceCheck = "לבחון";
    } else {
      // all - plural
      audienceCanVerb = "שתוכלו";
      audienceInterest = "מעניין אותכם";
      audienceGiveYou = "שאתן לכם";
      audienceYourSituation = "את המצב שלכם";
      audienceCheck = "לבחון";
    }

    // Phone number question audience form
    let phoneQuestion: string;
    if (ag === "female") {
      phoneQuestion = "מה מספר הטלפון שלך?";
    } else if (ag === "male") {
      phoneQuestion = "מה מספר הטלפון שלך?";
    } else {
      phoneQuestion = "מה מספר הטלפון שלכם?";
    }

    const message1 = `היי [שם פרטי] 👋 נעים להכיר, כאן [שם בעל העסק]\n${nicheDescription.trim()}\nאני ${ownerOfferVerb} שיחת אפיון קצרה ללא עלות, שתעזור לנו להבין ${audienceYourSituation}, ${audienceInterest} לשוחח ${audienceGiveYou} את כל המידע כדי ${audienceCanVerb} ${audienceCheck} אם זה מתאים?`;

    const buttonText = "כן, אשמח לפרטים נוספים";

    const message2 = `מצוין! 🙏\nכדי שלא נתכתב סתם, אני ${ownerPreferVerb} להסביר הכל בשיחה טלפונית קצרה וממוקדת.\n${phoneQuestion}`;

    logApiCall({
      endpoint: "/api/generate-chatbot",
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      chatbot: {
        message1,
        buttonText,
        message2,
        nicheDescription: nicheDescription.trim(),
      },
    });
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
