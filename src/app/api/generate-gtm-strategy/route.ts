import { NextRequest, NextResponse } from "next/server";
import { callAI } from "@/lib/ai";
import { buildGTMStrategyPrompt } from "@/lib/prompts";
import { logApiCall } from "@/lib/api-log";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    // Auth check: prevent unauthenticated AI credit consumption
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const { userName, answers, gtmOnboardingData, ganttMode } = await req.json();

    if (!answers || typeof answers !== "object") {
      return NextResponse.json(
        { error: "Missing or invalid answers" },
        { status: 400 },
      );
    }

    if (!userName || typeof userName !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid userName" },
        { status: 400 },
      );
    }

    let prompt: string;
    let maxTokens = 8000;

    if (ganttMode) {
      // Generate a focused 90-day Gantt execution timeline
      prompt = `אתה אסטרטג Go-To-Market ברמה עולמית. בהתבסס על תשובות השאלון של ${userName}, צור תוכנית פעולה מובנית ל-90 יום.

תשובות השאלון:
${Object.entries(answers).map(([k, v]) => `${k}: ${v}`).join("\n")}

${gtmOnboardingData ? `נתוני ליבה:
שם המיזם: ${gtmOnboardingData.idea_name || ""}
הבעיה: ${gtmOnboardingData.pain_point || ""}
UVP: ${gtmOnboardingData.uvp || ""}
ICP: ${gtmOnboardingData.icp || ""}
מודל הכנסות: ${gtmOnboardingData.revenue_model || ""}` : ""}

החזר JSON בפורמט הבא בלבד:
{
  "gantt": {
    "phases": [
      {
        "name": "Phase 1: Validation",
        "weeks": "שבועות 1-4",
        "tasks": [
          { "week": "שבוע 1", "task": "תיאור המשימה", "owner": "Founder", "deliverable": "התוצר" }
        ],
        "milestone": "אבן דרך של השלב"
      },
      {
        "name": "Phase 2: Launch",
        "weeks": "שבועות 5-8",
        "tasks": [...],
        "milestone": "..."
      },
      {
        "name": "Phase 3: Scale",
        "weeks": "שבועות 9-12",
        "tasks": [...],
        "milestone": "..."
      }
    ]
  }
}

כל שלב צריך 3-4 משימות שבועיות ספציפיות ומדידות. הכל בעברית.`;
      maxTokens = 4000;
    } else {
      prompt = buildGTMStrategyPrompt({ userName, answers, gtmOnboardingData });
    }

    const raw = await callAI("", prompt, maxTokens, { jsonMode: true });

    // Parse the JSON response
    const strategy = JSON.parse(raw);

    logApiCall({
      endpoint: "/api/generate-gtm-strategy",
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ strategy });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("generate-gtm-strategy error:", message);

    logApiCall({
      endpoint: "/api/generate-gtm-strategy",
      status: "error",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json(
      { error: `Failed to generate GTM strategy: ${message}` },
      { status: 500 },
    );
  }
}
