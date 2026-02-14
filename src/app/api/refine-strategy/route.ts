import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const { currentStrategy, feedback } = await req.json();

    if (!currentStrategy || typeof currentStrategy !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid currentStrategy" },
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
להלן מסמך אסטרטגיה שנוצר עבור בעל עסק:

---
${currentStrategy}
---

בעל העסק קרא את המסמך ונתן את ההערות הבאות:
"${feedback}"

עדכן את מסמך האסטרטגיה בהתאם להערות של בעל העסק.
שמור על אותו פורמט ומבנה, אבל תקן, דייק או שנה את התוכן לפי ההערות.
אם ההערות מבקשות לשנות פרטים ספציפיים (כמו שם, תחום, ניסיון) - עדכן אותם בכל המסמך.
החזר את המסמך המעודכן במלואו.
`;

    const refinedStrategy = await callAI("", prompt);

    return NextResponse.json({ strategy: refinedStrategy });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("refine-strategy error:", message);
    return NextResponse.json(
      { error: `Failed to refine strategy: ${message}` },
      { status: 500 },
    );
  }
}
