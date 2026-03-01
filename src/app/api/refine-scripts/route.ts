import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { logApiCall } from "@/lib/api-log";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { currentScripts, feedback } = await req.json();

    if (!currentScripts || typeof currentScripts !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid currentScripts" },
        { status: 400 },
      );
    }

    if (!feedback || typeof feedback !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid feedback" },
        { status: 400 },
      );
    }

    const prompt = `
להלן 3 תסריטי וידאו FBM שנוצרו:

---
${currentScripts}
---

המשתמש קרא את התסריטים ונתן את ההערות הבאות:
"${feedback}"

עדכן את התסריטים בהתאם להערות.
שמור על אותו פורמט ומבנה FBM (Hook, Agitate, Absolve, Solve, CTA).
שמור על אורך 60-90 שניות לכל תסריט.
אם ההערות מבקשות לשנות טון, תוכן, או זווית - עדכן בהתאם.
החזר את כל 3 התסריטים המעודכנים בפורמט Markdown.
`;

    const refinedScripts = await callAI("", prompt);

    logApiCall({
      endpoint: "/api/refine-scripts",
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ scripts: refinedScripts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("refine-scripts error:", message);

    logApiCall({
      endpoint: "/api/refine-scripts",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(
      { error: `Failed to refine scripts: ${message}` },
      { status: 500 },
    );
  }
}
