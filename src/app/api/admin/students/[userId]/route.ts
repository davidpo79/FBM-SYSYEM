import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const STEP_LABELS: Record<string, string> = {
  strategy: "אסטרטגיה",
  niches: "נישות",
  pains: "כאבים",
  scripts: "תסריטים",
  creative: "קריאייטיב",
  album: "אלבום",
};

const PIPELINE_STEPS = ["strategy", "niches", "pains", "scripts", "creative", "album"];

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: "חסר מזהה משתמש" },
        { status: 400 },
      );
    }

    // Get user info via admin API
    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !userData?.user) {
      console.error("admin/students/[userId] - getUser error:", userError);
      return NextResponse.json(
        { error: "משתמש לא נמצא" },
        { status: 404 },
      );
    }

    const user = userData.user;
    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email ||
      "";

    // Get full name from user_profiles table
    const { data: profileData } = await supabaseAdmin
      .from("user_profiles")
      .select("full_name")
      .eq("user_id", userId)
      .single();

    const displayName = profileData?.full_name || fullName;

    // Get user's projects
    const { data: projects } = await supabaseAdmin
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    const allProjects = projects ?? [];

    // Build project list matching the page's expected shape
    const projectInfos = allProjects.map((project) => {
      const status = project.status || "active";
      const completedSteps: string[] = [];

      // Determine completed steps from project data
      if (project.strategy) completedSteps.push("strategy");
      if (project.niche) completedSteps.push("niches");
      if (project.pains) completedSteps.push("pains");
      if (project.scripts) completedSteps.push("scripts");
      if (project.creative) completedSteps.push("creative");
      if (status === "completed") completedSteps.push("album");

      const stepNumber = completedSteps.length;
      const lastStep = PIPELINE_STEPS[stepNumber - 1] || PIPELINE_STEPS[0];

      return {
        id: project.id,
        name: project.user_name || project.name || "ללא שם",
        pipelineStep: STEP_LABELS[lastStep] || "אסטרטגיה",
        stepNumber,
        totalSteps: PIPELINE_STEPS.length,
      };
    });

    // Build pipeline steps for the first (latest) project
    const latestProject = allProjects[0];
    const pipelineSteps = PIPELINE_STEPS.map((step, i) => {
      let stepStatus: "completed" | "current" | "future" = "future";
      if (latestProject) {
        const completedCount = projectInfos[0]?.stepNumber ?? 0;
        if (i < completedCount) stepStatus = "completed";
        else if (i === completedCount) stepStatus = "current";
      }
      return {
        name: step,
        label: STEP_LABELS[step],
        status: stepStatus,
      };
    });

    // Build outputs summary
    const outputs = {
      strategyWordCount: 0,
      niche: "",
      scriptsCount: 0,
      creativesCount: 0,
      strategyPreview: "",
      scriptsPreview: "",
    };

    if (latestProject) {
      if (latestProject.strategy) {
        const strategyText = typeof latestProject.strategy === "string" ? latestProject.strategy : "";
        outputs.strategyWordCount = strategyText.split(/\s+/).filter(Boolean).length;
        outputs.strategyPreview = strategyText.slice(0, 500);
      }
      if (latestProject.niche) {
        outputs.niche = typeof latestProject.niche === "string" ? latestProject.niche : "";
      }
      if (latestProject.scripts) {
        const scriptsText = typeof latestProject.scripts === "string" ? latestProject.scripts : "";
        outputs.scriptsCount = scriptsText.split(/(?=## תסריט \d)/).filter((p: string) => p.trim().length > 0).length;
        outputs.scriptsPreview = scriptsText.slice(0, 500);
      }
    }

    // API usage stats for this user
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const { data: apiLogs } = await supabaseAdmin
      .from("api_logs")
      .select("endpoint, status, created_at, duration_ms")
      .eq("user_id", userId)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    const logs = apiLogs ?? [];
    const totalCalls = logs.length;
    const errors = logs.filter((l) => l.status === "error").length;
    const estimatedCost = totalCalls * 0.002; // rough estimate

    // Return flat StudentDetail shape matching the page
    return NextResponse.json({
      id: user.id,
      email: user.email,
      fullName: displayName,
      avatarLetter: displayName?.[0]?.toUpperCase() || "?",
      registeredAt: user.created_at,
      lastLogin: user.last_sign_in_at || user.created_at,
      projects: projectInfos,
      pipelineSteps,
      outputs,
      apiUsage: {
        totalCalls,
        errors,
        estimatedCost,
      },
    });
  } catch (e) {
    console.error("admin/students/[userId] exception:", e);
    return NextResponse.json(
      { error: "שגיאה בשליפת פרטי תלמיד" },
      { status: 500 },
    );
  }
}
