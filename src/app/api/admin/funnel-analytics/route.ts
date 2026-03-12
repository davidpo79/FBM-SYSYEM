import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const FUNNEL_STEPS = [
  "questionnaire",
  "strategy",
  "niches",
  "pains",
  "scripts",
  "creative",
  "copy",
  "album",
] as const;

const STEP_LABELS: Record<string, string> = {
  questionnaire: "שאלון",
  strategy: "אסטרטגיה",
  niches: "נישות",
  pains: "ניתוח כאבים",
  scripts: "תסריטים",
  creative: "קריאייטיב",
  copy: "קופי",
  album: "אלבום",
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30", 10);
    const validDays = [7, 30, 90].includes(days) ? days : 30;

    const now = new Date();
    const startDate = new Date(now.getTime() - validDays * 24 * 60 * 60 * 1000);

    // Fetch all user events for the period
    const { data: events, error: eventsError } = await supabaseAdmin
      .from("user_events")
      .select("event_type, event_name, step_name, metadata, user_id, project_id, session_id, created_at")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    if (eventsError) {
      console.error("funnel-analytics - events error:", eventsError);
      return NextResponse.json({ error: "שגיאה בשליפת אירועים" }, { status: 500 });
    }

    const allEvents = events ?? [];

    // ─── 1. Funnel Analysis: unique users at each step ───
    const stepUsers: Record<string, Set<string>> = {};
    const stepSessions: Record<string, Set<string>> = {};
    for (const step of FUNNEL_STEPS) {
      stepUsers[step] = new Set();
      stepSessions[step] = new Set();
    }

    for (const ev of allEvents) {
      if (ev.event_type === "page_view" && ev.step_name && stepUsers[ev.step_name]) {
        if (ev.user_id) stepUsers[ev.step_name].add(ev.user_id);
        if (ev.session_id) stepSessions[ev.step_name].add(ev.session_id);
      }
    }

    const funnelSteps = FUNNEL_STEPS.map((step, i) => {
      const users = stepUsers[step].size;
      const sessions = stepSessions[step].size;
      const prevUsers = i > 0 ? stepUsers[FUNNEL_STEPS[i - 1]].size : users;
      const dropoff = prevUsers > 0 ? ((prevUsers - users) / prevUsers * 100) : 0;
      const conversionFromStart = stepUsers[FUNNEL_STEPS[0]].size > 0
        ? (users / stepUsers[FUNNEL_STEPS[0]].size * 100)
        : 0;

      return {
        step,
        label: STEP_LABELS[step] || step,
        uniqueUsers: users,
        uniqueSessions: sessions,
        dropoffPercent: Math.round(dropoff * 10) / 10,
        conversionFromStart: Math.round(conversionFromStart * 10) / 10,
      };
    });

    // ─── 2. Step Completions (approved steps) ───
    const completionEvents = allEvents.filter(ev => ev.event_type === "step_complete");
    const stepCompletions: Record<string, number> = {};
    for (const ev of completionEvents) {
      const step = ev.step_name || "unknown";
      stepCompletions[step] = (stepCompletions[step] || 0) + 1;
    }

    // ─── 3. Generation Stats ───
    const generationStarts = allEvents.filter(ev => ev.event_type === "generation_start");
    const generationCompletes = allEvents.filter(ev => ev.event_type === "generation_complete");
    const generationErrors = allEvents.filter(ev => ev.event_type === "error");

    const generationStats = FUNNEL_STEPS.map(step => {
      const starts = generationStarts.filter(ev => ev.step_name === step).length;
      const completes = generationCompletes.filter(ev => ev.step_name === step).length;
      const errors = generationErrors.filter(ev => ev.step_name === step).length;
      return {
        step,
        label: STEP_LABELS[step] || step,
        starts,
        completes,
        errors,
        successRate: starts > 0 ? Math.round((completes / starts) * 1000) / 10 : 0,
      };
    }).filter(s => s.starts > 0);

    // ─── 4. Daily Active Users (page_view events grouped by day) ───
    const dailyUsers: Record<string, Set<string>> = {};
    const dailySessions: Record<string, Set<string>> = {};
    for (const ev of allEvents) {
      if (ev.event_type === "page_view") {
        const date = new Date(ev.created_at).toISOString().split("T")[0];
        if (!dailyUsers[date]) { dailyUsers[date] = new Set(); dailySessions[date] = new Set(); }
        if (ev.user_id) dailyUsers[date].add(ev.user_id);
        if (ev.session_id) dailySessions[date].add(ev.session_id);
      }
    }
    const dailyActivity = Object.entries(dailyUsers)
      .map(([date, users]) => ({
        date,
        users: users.size,
        sessions: dailySessions[date]?.size || 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ─── 5. Event Breakdown (top events by count) ───
    const eventCounts: Record<string, number> = {};
    for (const ev of allEvents) {
      const key = `${ev.event_type}:${ev.event_name}`;
      eventCounts[key] = (eventCounts[key] || 0) + 1;
    }
    const topEvents = Object.entries(eventCounts)
      .map(([key, count]) => {
        const [type, name] = key.split(":");
        return { type, name, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // ─── 6. Niche Analytics (what niches were generated/selected) ───
    const nicheEvents = allEvents.filter(
      ev => ev.event_name === "niches_generated" || ev.event_name === "niche_selected" || ev.event_name === "niche_toggled"
    );
    const nicheNameCounts: Record<string, { generated: number; selected: number; toggled: number }> = {};
    for (const ev of nicheEvents) {
      const meta = ev.metadata as Record<string, unknown> || {};
      if (ev.event_name === "niches_generated" && Array.isArray(meta.nicheNames)) {
        for (const name of meta.nicheNames as string[]) {
          if (!nicheNameCounts[name]) nicheNameCounts[name] = { generated: 0, selected: 0, toggled: 0 };
          nicheNameCounts[name].generated++;
        }
      }
      if (ev.event_name === "niche_toggled" && meta.nicheName) {
        const name = meta.nicheName as string;
        if (!nicheNameCounts[name]) nicheNameCounts[name] = { generated: 0, selected: 0, toggled: 0 };
        nicheNameCounts[name].toggled++;
      }
      if (ev.event_name === "niche_selected" && Array.isArray(meta.selectedNiches)) {
        for (const name of meta.selectedNiches as string[]) {
          if (!nicheNameCounts[name]) nicheNameCounts[name] = { generated: 0, selected: 0, toggled: 0 };
          nicheNameCounts[name].selected++;
        }
      }
    }
    const nicheAnalytics = Object.entries(nicheNameCounts)
      .map(([name, counts]) => ({ name, ...counts }))
      .sort((a, b) => b.selected - a.selected || b.toggled - a.toggled);

    // ─── 7. User Journey Tracking (per user, which steps they reached) ───
    const userJourneys: Record<string, Set<string>> = {};
    for (const ev of allEvents) {
      if (ev.event_type === "page_view" && ev.user_id && ev.step_name) {
        if (!userJourneys[ev.user_id]) userJourneys[ev.user_id] = new Set();
        userJourneys[ev.user_id].add(ev.step_name);
      }
    }

    // Find where users are stuck (last step they visited)
    const stuckAt: Record<string, number> = {};
    for (const [, steps] of Object.entries(userJourneys)) {
      let lastStepIdx = -1;
      for (const step of steps) {
        const idx = FUNNEL_STEPS.indexOf(step as typeof FUNNEL_STEPS[number]);
        if (idx > lastStepIdx) lastStepIdx = idx;
      }
      if (lastStepIdx >= 0 && lastStepIdx < FUNNEL_STEPS.length - 1) {
        const stepName = FUNNEL_STEPS[lastStepIdx];
        stuckAt[stepName] = (stuckAt[stepName] || 0) + 1;
      }
    }

    // Enrich with user emails for top stuck users
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const userEmails: Record<string, string> = {};
    if (usersData?.users) {
      for (const u of usersData.users) {
        userEmails[u.id] = u.email || u.id;
      }
    }

    // ─── 8. Biggest Leak Points ───
    const leakPoints = funnelSteps
      .filter(s => s.dropoffPercent > 0)
      .sort((a, b) => b.dropoffPercent - a.dropoffPercent)
      .slice(0, 5)
      .map(s => ({
        from: s.step,
        fromLabel: s.label,
        toLabel: STEP_LABELS[FUNNEL_STEPS[FUNNEL_STEPS.indexOf(s.step as typeof FUNNEL_STEPS[number]) + 1]] || "?",
        dropoffPercent: s.dropoffPercent,
        usersLost: funnelSteps[FUNNEL_STEPS.indexOf(s.step as typeof FUNNEL_STEPS[number]) - 1]
          ? funnelSteps[FUNNEL_STEPS.indexOf(s.step as typeof FUNNEL_STEPS[number]) - 1].uniqueUsers - s.uniqueUsers
          : 0,
      }));

    // ─── 9. Summary Metrics ───
    const totalUniqueUsers = new Set(allEvents.filter(e => e.user_id).map(e => e.user_id)).size;
    const totalSessions = new Set(allEvents.filter(e => e.session_id).map(e => e.session_id)).size;
    const totalEvents = allEvents.length;
    const completedProjects = completionEvents.filter(e => e.event_name === "project_completed").length;
    const overallConversion = totalUniqueUsers > 0
      ? Math.round((completedProjects / totalUniqueUsers) * 1000) / 10
      : 0;

    // ─── 10. Hourly Heatmap (when are users active) ───
    const hourlyActivity: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourlyActivity[h] = 0;
    for (const ev of allEvents) {
      if (ev.event_type === "page_view") {
        const hour = new Date(ev.created_at).getHours();
        hourlyActivity[hour]++;
      }
    }
    const hourlyHeatmap = Object.entries(hourlyActivity).map(([hour, count]) => ({
      hour: parseInt(hour),
      views: count,
    }));

    return NextResponse.json({
      period: validDays,
      summary: {
        totalUniqueUsers,
        totalSessions,
        totalEvents,
        completedProjects,
        overallConversion,
      },
      funnelSteps,
      stepCompletions,
      generationStats,
      dailyActivity,
      topEvents,
      nicheAnalytics,
      stuckAt,
      leakPoints,
      hourlyHeatmap,
    });
  } catch (e) {
    console.error("funnel-analytics exception:", e);
    return NextResponse.json({ error: "שגיאה בשליפת נתוני אנליטיקה" }, { status: 500 });
  }
}
