import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase() || "";
    const status = searchParams.get("status") || "";
    const niche = searchParams.get("niche") || "";

    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch all users via admin API
    const { data: usersData, error: usersError } =
      await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });

    if (usersError) {
      console.error("admin/students - listUsers error:", usersError);
      return NextResponse.json(
        { error: "שגיאה בשליפת משתמשים" },
        { status: 500 },
      );
    }

    const users = usersData?.users ?? [];

    // Fetch user profiles for full names and trial info
    const { data: profiles } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id, full_name, plan, trial_start, trial_days");
    const profileMap: Record<string, { fullName: string; plan: string; trialStart: string | null; trialDays: number }> = {};
    if (profiles) {
      for (const p of profiles) {
        profileMap[p.user_id] = {
          fullName: p.full_name,
          plan: p.plan || "trial",
          trialStart: p.trial_start || null,
          trialDays: p.trial_days ?? 30,
        };
      }
    }

    // Fetch all projects
    const { data: projects, error: projError } = await supabaseAdmin
      .from("projects")
      .select("id, user_id, user_name, status, pipeline_data, created_at, owner_niche, track");

    if (projError) {
      console.error("admin/students - projects error:", projError);
    }

    const projectList = projects ?? [];

    // Build student list
    let students = users.map((user) => {
      const userProjects = projectList.filter((p) => p.user_id === user.id);
      const lastProject = userProjects.length > 0
        ? userProjects.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          )[0]
        : null;

      const lastSignIn = user.last_sign_in_at
        ? new Date(user.last_sign_in_at)
        : null;

      let userStatus: "active" | "at_risk" | "inactive" = "inactive";
      if (lastSignIn) {
        if (lastSignIn >= fourteenDaysAgo) {
          userStatus = "active";
        } else if (lastSignIn >= sevenDaysAgo) {
          userStatus = "at_risk";
        } else {
          userStatus = "inactive";
        }
      }

      // Determine current step from pipeline_data
      const STEP_LABELS: Record<string, string> = {
        strategy: "אסטרטגיה",
        niches: "נישות",
        pains: "כאבים",
        scripts: "תסריטים",
        creative: "קריאייטיב",
        album: "אלבום",
      };
      const PIPELINE_STEPS = ["strategy", "niches", "pains", "scripts", "creative", "album"];

      let stepNumber = 0;
      let currentStepLabel = "";
      if (lastProject?.pipeline_data) {
        const pipeline = lastProject.pipeline_data as Record<string, unknown>;
        if (pipeline.strategy) stepNumber++;
        if (pipeline.niches) stepNumber++;
        if (pipeline.pains) stepNumber++;
        if (pipeline.scripts) stepNumber++;
        if (pipeline.creative || pipeline.generatedImages) stepNumber++;
        if (lastProject.status === "completed") stepNumber++;
        const currentKey = PIPELINE_STEPS[Math.max(0, stepNumber - 1)] || PIPELINE_STEPS[0];
        currentStepLabel = STEP_LABELS[currentKey] || "";
      }

      const userNiche = lastProject?.owner_niche ||
        (lastProject?.pipeline_data as Record<string, unknown>)?.niches ||
        null;
      const nicheDisplay = typeof userNiche === "string" ? userNiche : "";

      const profile = profileMap[user.id];

      // Determine user track: GTM, FBM, or both
      const hasGtmProject = userProjects.some((p) => (p as Record<string, unknown>).track === "gtm");
      const hasFbmProject = userProjects.some((p) => !(p as Record<string, unknown>).track || (p as Record<string, unknown>).track === "fbm");
      const isGtmPlan = ["gtm_diy", "gtm_pro"].includes(profile?.plan || "");
      const userTrack: "gtm" | "fbm" | "both" =
        (hasGtmProject || isGtmPlan) && hasFbmProject ? "both" :
        (hasGtmProject || isGtmPlan) ? "gtm" : "fbm";

      // Calculate trial days left
      let trialDaysLeft: number | null = null;
      const userPlan = profile?.plan || "trial";
      if (userPlan === "trial" && profile?.trialStart) {
        const diff = Math.floor(
          (now.getTime() - new Date(profile.trialStart).getTime()) / (1000 * 60 * 60 * 24)
        );
        trialDaysLeft = Math.max(0, (profile.trialDays ?? 30) - diff);
      }

      return {
        id: user.id,
        email: user.email || "",
        fullName:
          profile?.fullName ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email ||
          "",
        lastLogin: user.last_sign_in_at || user.created_at,
        niche: nicheDisplay,
        currentStep: currentStepLabel,
        stepNumber,
        totalSteps: PIPELINE_STEPS.length,
        status: userStatus,
        plan: userPlan,
        trialDays: profile?.trialDays ?? 30,
        trialDaysLeft,
        userTrack,
      };
    });

    // Apply filters
    if (search) {
      students = students.filter(
        (s) =>
          s.email.toLowerCase().includes(search) ||
          s.fullName.toLowerCase().includes(search),
      );
    }

    if (status) {
      students = students.filter((s) => s.status === status);
    }

    if (niche) {
      students = students.filter(
        (s) =>
          s.niche &&
          String(s.niche).toLowerCase().includes(niche.toLowerCase()),
      );
    }

    // Sort by last login descending
    students.sort((a, b) => {
      if (!a.lastLogin) return 1;
      if (!b.lastLogin) return -1;
      return (
        new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime()
      );
    });

    return NextResponse.json({ students });
  } catch (e) {
    console.error("admin/students exception:", e);
    return NextResponse.json(
      { error: "שגיאה בשליפת רשימת תלמידים" },
      { status: 500 },
    );
  }
}
