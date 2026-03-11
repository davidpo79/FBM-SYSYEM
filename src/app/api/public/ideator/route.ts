import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { logApiCall } from "@/lib/api-log";

const API_CATEGORIES: Record<string, string> = {
  "ai-automation": "AI ואוטומציה",
  "fintech": "פינטק",
  "healthtech": "הלט'טק",
  "edtech": "חינוך וטכנולוגיה",
  "ecommerce": "E-Commerce וקמעונאות",
  "devtools": "כלים למפתחים",
  "saas-b2b": "SaaS B2B",
  "creator-economy": "כלכלת יוצרים",
  "sustainability": "קלינטק וקיימות",
  "proptech": "נדל\"ן וטכנולוגיה",
  "legaltech": "משפטי וטכנולוגיה",
  "hrtech": "HR וגיוס",
};

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
    const { category, admin_key } = await req.json();

    // Admin bypass: skip rate limiting if correct key is provided
    const isAdmin = admin_key && process.env.IDEATOR_ADMIN_KEY && admin_key === process.env.IDEATOR_ADMIN_KEY;

    if (ratelimit && !isAdmin) {
      const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
      const { success } = await ratelimit.limit(ip);
      if (!success) {
        return NextResponse.json(
          { error: "הגעת למגבלת הרעיונות היומית. נסה שוב מחר או הירשם לבוטקאמפ!" },
          { status: 429 }
        );
      }
    }

    const catLabel = API_CATEGORIES[category] || category || "טכנולוגיה כללית";

    const prompt = `אתה מנוע יצירת רעיונות סטארטאפ ברמה עולמית עבור תוכנית GTM BootCamp.

ייצר בדיוק 3 רעיונות ייחודיים למוצר Micro-SaaS בקטגוריית "${catLabel}".

לכל רעיון ספק:
1. name - שם מוצר קליט (2-3 מילים באנגלית)
2. tagline - משפט ערך אחד (עד 12 מילים)
3. problem - נקודת הכאב הספציפית שהמוצר פותר (2-3 משפטים)
4. solution - איך המוצר פותר את זה (2-3 משפטים)
5. target_audience - מי ישלם על זה (ספציפי)
6. monetization - איך זה מרוויח כסף (מודל תמחור + מחיר מוצע)
7. mvp_scope - מה כולל ה-MVP (3-5 נקודות)
8. competitive_edge - למה זה מנצח מול אלטרנטיבות (1-2 משפטים)
9. market_size - הערכת גודל שוק TAM/SAM
10. difficulty - "easy" | "medium" | "hard" (רמת קושי לבניית MVP)
11. apis_used - רשימה של 2-5 APIs ספציפיים שנדרשים לבנייה (לדוגמה: Twilio, Stripe, OpenAI, Shopify, Slack, Google Sheets, Notion, Airtable, HubSpot, SendGrid, Firebase, WhatsApp, Google Maps, Calendly, Zoom, Plaid וכד')
12. api_explanation - הסבר של 2-3 משפטים: איך שילובי ה-API מתחברים יחד ליצירת הפתרון. לדוגמה: "Twilio לשליחת SMS ללקוחות, Stripe לגביית תשלומים אוטומטית, ו-OpenAI לניתוח טקסט חכם ויצירת תגובות מותאמות."

דרישות:
- רעיונות שמפתח יחיד יכול לבנות ב-2-4 שבועות
- התמקד בבעיות נישה עם נכונות לשלם
- כל רעיון שונה בגישה ובקהל היעד
- שילובי ה-API חייבים להיות ריאליים ולהתאים לפתרון
- כל הטקסט בעברית (חוץ משמות APIs ומונחים טכניים)

החזר JSON בלבד (בלי backticks):
{
  "ideas": [
    {
      "name": "...",
      "tagline": "...",
      "problem": "...",
      "solution": "...",
      "target_audience": "...",
      "monetization": "...",
      "mvp_scope": ["...", "...", "..."],
      "competitive_edge": "...",
      "market_size": "...",
      "difficulty": "easy",
      "apis_used": ["Twilio", "Stripe", "OpenAI"],
      "api_explanation": "..."
    }
  ]
}`;

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
