import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { logApiCall } from "@/lib/api-log";

let ratelimit: Ratelimit | null = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(3, "24 h"),
    });
  }
} catch (e) {
  console.warn("Upstash Redis not configured. Rate limiting disabled.");
}

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    if (ratelimit) {
      const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
      const { success } = await ratelimit.limit(ip);
      if (!success) {
        return NextResponse.json(
          { error: "הגעת למגבלת הרעיונות היומית. נסה שוב מחר או הירשם לבוטקאמפ!" },
          { status: 429 }
        );
      }
    }
    const { niche } = await req.json();

    if (!niche || typeof niche !== "string" || niche.trim().length < 2) {
      return Response.json({ error: "יש להזין קהל יעד או נישה" }, { status: 400 });
    }

    const prompt = `אתה יועץ אסטרטגי ויזם טכנולוגי ברמה עולמית. המשתמש מתאר קהל יעד או נישה: "${niche.trim()}".

המשימה שלך: תכנן 3 רעיונות Micro-SaaS רווחיים במיוחד שפותרים בעיה אמיתית עבור הנישה הזו.

לכל רעיון:
1. זהה בעיה כואבת של קהל היעד
2. הצע פתרון SaaS שפותר אותה
3. בחר את שילובי ה-API הנכונים ליישום (מתוך כלים כמו: Twilio, Stripe, OpenAI, Shopify, Slack, Google Sheets, Notion, Airtable, HubSpot, SendGrid, Firebase, WhatsApp, Google Maps, Calendly, Zoom, Plaid, ועוד)
4. הסבר למה כל API נחוץ ואיך הם מתחברים יחד

החזר JSON תקני בלבד בפורמט הבא:
{
  "ideas": [
    {
      "name": "שם המוצר (2-3 מילים באנגלית)",
      "pitch": "משפט אחד חד על מה המוצר עושה ולמה הוא שווה כסף",
      "niche": "קהל היעד הספציפי",
      "marketSize": "גודל שוק מוערך בשקלים או דולרים עם הסבר קצר",
      "apisUsed": ["API1", "API2", "API3"],
      "apiExplanation": "הסבר קצר של 2-3 משפטים: איך שילובי ה-API מתחברים יחד לפתרון. למשל: Twilio לשליחת SMS ללקוחות, Stripe לגביית תשלום אוטומטית, ו-OpenAI לניתוח טקסט חכם.",
      "monetization": "מי משלם, למה הם משלמים, מודל תמחור, והכנסה צפויה ללקוח"
    }
  ]
}

כללים:
- רעיונות שניתן לבנות על ידי מפתח יחיד ב-2-4 שבועות
- התמקד ב-B2B או prosumer — אנשים שמשלמים על כלים
- ה-niche חייב להיות ספציפי ומוגדר היטב
- ה-apisUsed חייב להכיל לפחות 2-4 APIs רלוונטיים
- ה-apiExplanation חייב להסביר בבירור למה כל API נחוץ ואיך הם עובדים יחד
- גודל השוק צריך להיות ריאלי ומוסבר
- החזר בדיוק 3 רעיונות
- כל הטקסט בעברית (חוץ משמות APIs ומונחים טכניים)`;

    const text = await callAI("", prompt, 4000, { jsonMode: true });
    const parsed = JSON.parse(text);

    logApiCall({
      endpoint: "/api/public/ideator",
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return Response.json(parsed);
  } catch (error: unknown) {
    console.error("Ideator API error:", error);

    logApiCall({
      endpoint: "/api/public/ideator",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });

    return Response.json(
      { error: error instanceof Error ? error.message : "נכשל ביצירת רעיונות" },
      { status: 500 },
    );
  }
}
