import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;

    if (!projectId) {
      return NextResponse.json({ error: "חסר מזהה פרויקט" }, { status: 400 });
    }

    // Fetch project using admin client (bypasses RLS)
    const { data: project, error: dbErr } = await supabaseAdmin
      .from("projects")
      .select("id, user_id, user_name, answers_map, status, pipeline_data, created_at")
      .eq("id", projectId)
      .single();

    if (dbErr || !project) {
      return NextResponse.json({ error: "פרויקט לא נמצא" }, { status: 404 });
    }

    // Get user email
    let email = "";
    try {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(project.user_id);
      email = userData?.user?.email || "";
    } catch { /* ignore */ }

    const pipeline = (project.pipeline_data || {}) as Record<string, unknown>;

    return NextResponse.json({
      id: project.id,
      userId: project.user_id,
      userName: project.user_name,
      email,
      status: project.status,
      createdAt: project.created_at,
      answersMap: project.answers_map,
      pipeline: {
        strategy: (pipeline.strategy as string) || "",
        strategyApproved: !!pipeline.strategyApproved,
        niches: pipeline.niches || [],
        selectedNiche: pipeline.selectedNiche || null,
        painAnalysis: (pipeline.painAnalysis as string) || "",
        scripts: (pipeline.scripts as string) || "",
        generatedImages: Array.isArray(pipeline.generatedImages) ? pipeline.generatedImages : [],
        adCopy: (pipeline.adCopy as string) || "",
      },
    });
  } catch (e) {
    console.error("admin/project/[projectId] error:", e);
    return NextResponse.json({ error: "שגיאה בשליפת פרויקט" }, { status: 500 });
  }
}
