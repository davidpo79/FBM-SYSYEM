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
    const { apis, market, niche } = await req.json();

    if (!apis || !Array.isArray(apis) || apis.length === 0) {
      return Response.json({ error: "יש לבחור לפחות API/כלי אחד" }, { status: 400 });
    }

    const apiList = apis.join(", ");
    const marketLabel = market === "israel" ? "ישראלי" : "בינלאומי";
    const marketContext = market === "israel"
      ? `השוק הוא ישראלי. התאם את גודל השוק, קהל היעד, והתמחור לשוק הישראלי (שקלים, עסקים ישראליים, הקשר מקומי). קח בחשבון את גודל האוכלוסייה (~9M), מאפייני השוק המקומי, והעדפות תשלום בישראל.`
      : `השוק הוא בינלאומי/גלובלי. התאם את גודל השוק, קהל היעד, והתמחור לשוק הגלובלי (דולרים, קהל עולמי). קח בחשבון שווקים מרכזיים כמו ארה"ב, אירופה, ו-APAC.`;

    const nicheContext = niche
      ? `\nקהל היעד / הבעיה שהמשתמש רוצה לפתור: "${niche}"\nהתאם כל רעיון לנישה הזו ספציפית.\n`
      : "";

    const prompt = `אתה Tech Lead ברמה עולמית מעמק הסיליקון. המשתמש מספק APIs או כלים ספציפיים: ${apiList}.

שוק יעד: ${marketLabel}
${marketContext}
${nicheContext}
תכנן 3 רעיונות Micro-SaaS היפר-ספציפיים ורווחיים במיוחד המשלבים בדיוק את ה-APIs האלה.

החזר JSON תקני בלבד בפורמט הבא:
{
  "ideas": [
    {
      "name": "שם המוצר (2-3 מילים באנגלית)",
      "pitch": "משפט אחד אגרסיבי על מה המוצר עושה ולמה הוא מכונת כסף",
      "niche": "קהל היעד הספציפי (לדוגמה: סוכני נדל\"ן, מאמני כושר, חנויות e-commerce)",
      "marketSize": "גודל שוק מוערך / שווי בשקלים או דולרים",
      "apisUsed": ["${apis.join('", "')}"],
      "monetization": "מי משלם, למה הם משלמים, מודל תמחור, והכנסה צפויה ללקוח"
    }
  ]
}

כללים:
- כל רעיון חייב להשתמש בכל ה-APIs/כלים שסופקו: ${apiList}
- רעיונות שניתן לבנות על ידי מפתח יחיד ב-2-4 שבועות
- התמקד ב-B2B או prosumer — אנשים שמשלמים על כלים
- התאם את נתוני גודל השוק והקהל לשוק ה${marketLabel}
- ה-niche חייב להיות ספציפי ומוגדר היטב
- ה-apisUsed חייב להכיל רשימה של כל ה-APIs שהרעיון משתמש בהם
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
