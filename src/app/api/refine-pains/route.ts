import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { logApiCall } from "@/lib/api-log";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { currentPainAnalysis, feedback, selectedNiche } = await req.json();

    if (!currentPainAnalysis || typeof currentPainAnalysis !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid currentPainAnalysis" },
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
להלן מסמך ניתוח כאבים שנוצר עבור הנישה "${selectedNiche || ""}":

---
${currentPainAnalysis}
---

המשתמש קרא את המסמך ונתן את ההערות הבאות:
"${feedback}"

עדכן את מסמך ניתוח הכאבים בהתאם להערות.
שמור על אותו פורמט ומבנה, אבל תקן, דייק או שנה את התוכן לפי ההערות.
אם ההערות מבקשות לשנות זוויות, כאבים ספציפיים, או סגנון - עדכן אותם בכל המסמך.
החזר את המסמך המעודכן במלואו בפורמט Markdown.
`;

    const refinedPainAnalysis = await callAI("", prompt);

    logApiCall({
      endpoint: "/api/refine-pains",
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ painAnalysis: refinedPainAnalysis });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("refine-pains error:", message);

    logApiCall({
      endpoint: "/api/refine-pains",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(
      { error: `Failed to refine pain analysis: ${message}` },
      { status: 500 },
    );
  }
}
