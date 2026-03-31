import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "7", 10);
    const validDays = [7, 30].includes(days) ? days : 7;

    const now = new Date();
    const startDate = new Date(
      now.getTime() - validDays * 24 * 60 * 60 * 1000,
    );

    // Fetch all API logs for the period
    const { data: logs, error: logsError } = await supabaseAdmin
      .from("api_logs")
      .select("endpoint, status, created_at, duration_ms, user_id, error_message")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    if (logsError) {
      console.error("admin/analytics - logs error:", logsError);
      return NextResponse.json(
        { error: "שגיאה בשליפת לוגים" },
        { status: 500 },
      );
    }

    const allLogs = logs ?? [];

    // Daily API call counts (grouped by date)
    const dailyCounts: Record<string, { date: string; calls: number; errors: number }> = {};
    for (const log of allLogs) {
      const date = log.created_at
        ? new Date(log.created_at).toISOString().split("T")[0]
        : "unknown";
      if (!dailyCounts[date]) {
        dailyCounts[date] = { date, calls: 0, errors: 0 };
      }
      dailyCounts[date].calls++;
      if (log.status === "error") {
        dailyCounts[date].errors++;
      }
    }
    const dailyStats = Object.values(dailyCounts).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    // Per-endpoint stats
    const endpointMap: Record<
      string,
      { endpoint: string; calls: number; errors: number; totalDuration: number }
    > = {};
    for (const log of allLogs) {
      const ep = log.endpoint || "unknown";
      if (!endpointMap[ep]) {
        endpointMap[ep] = { endpoint: ep, calls: 0, errors: 0, totalDuration: 0 };
      }
      endpointMap[ep].calls++;
      if (log.status === "error") {
        endpointMap[ep].errors++;
      }
      endpointMap[ep].totalDuration += log.duration_ms || 0;
    }
    const endpointStats = Object.values(endpointMap)
      .map((ep) => ({
        endpoint: ep.endpoint,
        calls: ep.calls,
        errors: ep.errors,
        avgDuration: ep.calls > 0 ? Math.round(ep.totalDuration / ep.calls) : 0,
      }))
      .sort((a, b) => b.calls - a.calls);

    // Top users by usage
    const userMap: Record<string, { userId: string; calls: number }> = {};
    for (const log of allLogs) {
      const uid = log.user_id || "anonymous";
      if (!userMap[uid]) {
        userMap[uid] = { userId: uid, calls: 0 };
      }
      userMap[uid].calls++;
    }
    const topUsers = Object.values(userMap)
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 10);

    // Enrich top users with email
    const userIds = topUsers
      .map((u) => u.userId)
      .filter((id) => id !== "anonymous");

    const userEmails: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: usersData } =
        await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      if (usersData?.users) {
        for (const u of usersData.users) {
          userEmails[u.id] = u.email || u.id;
        }
      }
    }

    const topUsersEnriched = topUsers.map((u) => ({
      userId: u.userId,
      email: userEmails[u.userId] || u.userId,
      calls: u.calls,
    }));

    // Recent errors (last 20)
    const recentErrors = allLogs
      .filter((l) => l.status === "error")
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 20)
      .map((l) => ({
        endpoint: l.endpoint,
        errorMessage: l.error_message,
        userId: l.user_id,
        email: userEmails[l.user_id] || l.user_id,
        createdAt: l.created_at,
      }));

    return NextResponse.json({
      period: validDays,
      dailyStats,
      endpointStats,
      topUsers: topUsersEnriched,
      recentErrors,
      totalCalls: allLogs.length,
      totalErrors: allLogs.filter((l) => l.status === "error").length,
    });
  } catch (e) {
    console.error("admin/analytics exception:", e);
    return NextResponse.json(
      { error: "שגיאה בשליפת נתוני אנליטיקה" },
      { status: 500 },
    );
  }
}
