import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const EMPTY_RESPONSE = {
  stats: {},
  recentFeedback: [],
  summary: { totalApproves: 0, totalRefines: 0, approvalRate: 0 },
};

export async function GET() {
  try {
    // Get feedback stats by step
    const { data: stepStats, error: stepErr } = await supabaseAdmin
      .from("feedback_logs")
      .select("step_name, feedback_type");

    // If table doesn't exist or query fails, return empty data gracefully
    if (stepErr) {
      console.warn("feedback_logs query failed (table may not exist):", stepErr.message);
      return NextResponse.json(EMPTY_RESPONSE);
    }

    // Aggregate stats per step
    const stats: Record<string, { approve: number; refine: number }> = {};
    for (const row of stepStats || []) {
      if (!stats[row.step_name]) {
        stats[row.step_name] = { approve: 0, refine: 0 };
      }
      if (row.feedback_type === "approve") stats[row.step_name].approve++;
      if (row.feedback_type === "refine") stats[row.step_name].refine++;
    }

    // Get recent feedback with text (last 50)
    const { data: recentFeedback, error: recentErr } = await supabaseAdmin
      .from("feedback_logs")
      .select("*")
      .eq("feedback_type", "refine")
      .not("feedback_text", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);

    if (recentErr) {
      console.warn("feedback_logs recent query failed:", recentErr.message);
    }

    // Total counts
    const totalApproves = Object.values(stats).reduce((sum, s) => sum + s.approve, 0);
    const totalRefines = Object.values(stats).reduce((sum, s) => sum + s.refine, 0);
    const approvalRate = totalApproves + totalRefines > 0
      ? Math.round((totalApproves / (totalApproves + totalRefines)) * 100)
      : 0;

    return NextResponse.json({
      stats,
      recentFeedback: recentFeedback || [],
      summary: {
        totalApproves,
        totalRefines,
        approvalRate,
      },
    });
  } catch (error) {
    console.error("admin/feedback error:", error);
    // Return empty data instead of 500 so the page renders gracefully
    return NextResponse.json(EMPTY_RESPONSE);
  }
}
