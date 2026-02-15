import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Fetch all users via admin API
    const { data: usersData, error: usersError } =
      await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });

    if (usersError) {
      console.error("admin/stats - listUsers error:", usersError);
      return NextResponse.json(
        { error: "שגיאה בשליפת משתמשים" },
        { status: 500 },
      );
    }

    const users = usersData?.users ?? [];
    const totalStudents = users.length;

    const activeStudents = users.filter((u) => {
      if (!u.last_sign_in_at) return false;
      return new Date(u.last_sign_in_at) >= fourteenDaysAgo;
    }).length;

    const inactiveStudents = totalStudents - activeStudents;

    // Total projects
    const { count: totalProjects, error: projError } = await supabaseAdmin
      .from("projects")
      .select("*", { count: "exact", head: true });

    if (projError) {
      console.error("admin/stats - projects count error:", projError);
    }

    // Completed projects
    const { count: completedProjects, error: compError } = await supabaseAdmin
      .from("projects")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    if (compError) {
      console.error("admin/stats - completed projects error:", compError);
    }

    // API calls this month
    const { count: apiCallsMonth, error: apiError } = await supabaseAdmin
      .from("api_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfMonth.toISOString());

    if (apiError) {
      console.error("admin/stats - api_logs month error:", apiError);
    }

    // Errors in last 24 hours
    const { count: errorsDay, error: errError } = await supabaseAdmin
      .from("api_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", twentyFourHoursAgo.toISOString())
      .eq("success", false);

    if (errError) {
      console.error("admin/stats - api_logs errors error:", errError);
    }

    // Stuck students - users with oldest last activity (top 5)
    const stuckStudents = users
      .filter((u) => u.last_sign_in_at)
      .sort(
        (a, b) =>
          new Date(a.last_sign_in_at!).getTime() -
          new Date(b.last_sign_in_at!).getTime(),
      )
      .slice(0, 5)
      .map((u) => ({
        id: u.id,
        email: u.email,
        fullName:
          u.user_metadata?.full_name || u.user_metadata?.name || u.email,
        lastSignIn: u.last_sign_in_at,
      }));

    // Recent invites from welcome_tokens
    const { data: recentInvites, error: invError } = await supabaseAdmin
      .from("welcome_tokens")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (invError) {
      console.error("admin/stats - welcome_tokens error:", invError);
    }

    return NextResponse.json({
      totalStudents,
      activeStudents,
      inactiveStudents,
      totalProjects: totalProjects ?? 0,
      completedProjects: completedProjects ?? 0,
      apiCallsMonth: apiCallsMonth ?? 0,
      errorsDay: errorsDay ?? 0,
      stuckStudents,
      recentInvites: recentInvites ?? [],
    });
  } catch (e) {
    console.error("admin/stats exception:", e);
    return NextResponse.json(
      { error: "שגיאה בשליפת נתוני דשבורד" },
      { status: 500 },
    );
  }
}
