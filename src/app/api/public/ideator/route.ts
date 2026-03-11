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
    const { apis, market, apiSystems } = await req.json();

    if (!apis || !Array.isArray(apis) || apis.length === 0) {
      return Response.json({ error: "יש לבחור לפחות API/כלי אחד" }, { status: 400 });
    }

    const apiList = apis.join(", ");
    const marketLabel = market === "israel" ? "ישראלי" : "בינלאומי";
    const marketContext = market === "israel"
      ? `השוק הוא ישראלי. התאם את גודל השוק, קהל היעד, והתמחור לשוק הישראלי (שקלים, עסקים ישראליים, הקשר מקומי). קח בחשבון את גודל האוכלוסייה (~9M), מאפייני השוק המקומי, והעדפות תשלום בישראל.`
      : `השוק הוא בינלאומי/גלובלי. התאם את גודל השוק, קהל היעד, והתמחור לשוק הגלובלי (דולרים, קהל עולמי). קח בחשבון שווקים מרכזיים כמו ארה"ב, אירופה, ו-APAC.`;

    const apiSystemsContext = apiSystems
      ? `\nהמשתמש תיאר את מערכות ה-API והחיבורים שהוא מתכנן:\n${apiSystems}\nקח את זה בחשבון בתכנון הארכיטקטורה.\n`
      : "";

    const prompt = `אתה Tech Lead ברמה עולמית מעמק הסיליקון. המשתמש מספק APIs או כלים ספציפיים: ${apiList}.

שוק יעד: ${marketLabel}
${marketContext}
${apiSystemsContext}
תכנן 3 רעיונות Micro-SaaS היפר-ספציפיים ורווחיים במיוחד המשלבים בדיוק את ה-APIs האלה.

החזר JSON תקני בלבד בפורמט הבא:
{
  "ideas": [
    {
      "name": "שם המוצר (2-3 מילים באנגלית)",
      "pitch": "משפט אחד אגרסיבי על מה המוצר עושה ולמה הוא מכונת כסף",
      "architecture": "לוגיקת חיבור API צעד-אחר-צעד. איך ${apiList} מתחברים טכנית. היה ספציפי לגבי זרימת הנתונים ונקודות האינטגרציה.",
      "monetization": "מי משלם, למה הם משלמים, מודל תמחור, והכנסה צפויה ללקוח. כלול גודל שוק מוערך ו-TAM."
    }
  ]
}

כללים:
- כל רעיון חייב להשתמש בכל ה-APIs/כלים שסופקו: ${apiList}
- רעיונות שניתן לבנות על ידי מפתח יחיד ב-2-4 שבועות
- התמקד ב-B2B או prosumer — אנשים שמשלמים על כלים
- היה ספציפי וטכני בסעיף הארכיטקטורה
- התאם את נתוני גודל השוק והקהל לשוק ה${marketLabel}
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
