import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

    // Get user's projects
    const { data: projects, error: projError } = await supabaseAdmin
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (projError) {
      console.error("admin/students/[userId] - projects error:", projError);
    }

    // Build pipeline progress for each project
    const projectsWithProgress = (projects ?? []).map((project) => {
      const pipeline = (project.pipeline_data || {}) as Record<string, unknown>;
      const steps = [
        "niche",
        "pains",
        "strategy",
        "scripts",
        "creatives",
        "campaign",
      ];

      const completedSteps = steps.filter((step) => !!pipeline[step]);
      const progress = Math.round(
        (completedSteps.length / steps.length) * 100,
      );
      const currentStep =
        completedSteps.length > 0
          ? completedSteps[completedSteps.length - 1]
          : null;

      return {
        id: project.id,
        name: project.user_name || project.niche || "ללא שם",
        niche: project.niche,
        status: project.status,
        createdAt: project.created_at,
        pipelineProgress: progress,
        currentStep,
        completedSteps,
        totalSteps: steps.length,
      };
    });

    // API usage stats for this user
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const { data: apiLogs, error: apiError } = await supabaseAdmin
      .from("api_logs")
      .select("endpoint, success, created_at, duration_ms")
      .eq("user_id", userId)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    if (apiError) {
      console.error("admin/students/[userId] - api_logs error:", apiError);
    }

    const logs = apiLogs ?? [];
    const totalCalls = logs.length;
    const successCalls = logs.filter((l) => l.success).length;
    const errorCalls = totalCalls - successCalls;
    const avgDuration =
      logs.length > 0
        ? Math.round(
            logs.reduce((sum, l) => sum + (l.duration_ms || 0), 0) /
              logs.length,
          )
        : 0;

    // Group calls by endpoint
    const endpointStats: Record<
      string,
      { calls: number; errors: number }
    > = {};
    for (const log of logs) {
      const ep = log.endpoint || "unknown";
      if (!endpointStats[ep]) {
        endpointStats[ep] = { calls: 0, errors: 0 };
      }
      endpointStats[ep].calls++;
      if (!log.success) {
        endpointStats[ep].errors++;
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email,
        phone: user.phone || user.user_metadata?.phone || null,
        createdAt: user.created_at,
        lastSignIn: user.last_sign_in_at,
        provider: user.app_metadata?.provider || null,
      },
      projects: projectsWithProgress,
      apiUsage: {
        totalCalls,
        successCalls,
        errorCalls,
        avgDuration,
        endpointStats,
        recentLogs: logs.slice(0, 50),
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
