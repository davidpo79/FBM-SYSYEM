import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const { projectId, stepName, feedbackType, feedbackText } = await req.json();

    if (!stepName || !feedbackType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    await supabaseAdmin.from("feedback_logs").insert({
      project_id: projectId || null,
      step_name: stepName,
      feedback_type: feedbackType,
      feedback_text: feedbackText || null,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("log-feedback error:", error);
    return NextResponse.json(
      { error: "Failed to log feedback" },
      { status: 500 },
    );
  }
}
