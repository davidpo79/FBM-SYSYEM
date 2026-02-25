import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { logApiCall } from "@/lib/api-log";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { currentCopy, feedback, niche } = await req.json();

    if (!currentCopy || typeof currentCopy !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid currentCopy" },
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
להלן קופי למודעת פייסבוק שנוצר עבור הנישה "${niche || ""}":

---
${currentCopy}
---

המשתמש קרא את הקופי ונתן את ההערות הבאות:
"${feedback}"

עדכן את הקופי בהתאם להערות.
שמור על אותו פורמט של קופי לפייסבוק (פתיחה חזקה, גוף, CTA).
אם ההערות מבקשות לשנות טון, אורך, או גישה - עדכן בהתאם.
החזר את הקופי המעודכן בלבד, ללא הסברים.
`;

    const refinedCopy = await callAI("", prompt);

    logApiCall({
      endpoint: "/api/refine-copy",
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ copy: refinedCopy });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("refine-copy error:", message);

    logApiCall({
      endpoint: "/api/refine-copy",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(
      { error: `Failed to refine copy: ${message}` },
      { status: 500 },
    );
  }
}
