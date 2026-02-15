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

    // Fetch all projects
    const { data: projects, error: projError } = await supabaseAdmin
      .from("projects")
      .select("id, user_id, user_name, status, pipeline_data, created_at, niche");

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
      let currentStep: string | undefined;
      if (lastProject?.pipeline_data) {
        const pipeline = lastProject.pipeline_data as Record<string, unknown>;
        const steps = [
          "niche",
          "pains",
          "strategy",
          "scripts",
          "creatives",
          "campaign",
        ];
        currentStep = steps[0];
        for (const step of steps) {
          if (pipeline[step]) {
            currentStep = step;
          }
        }
      }

      const userNiche = lastProject?.niche ||
        (lastProject?.pipeline_data as Record<string, unknown>)?.niche ||
        null;

      return {
        id: user.id,
        email: user.email || "",
        fullName:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email ||
          "",
        lastSignIn: user.last_sign_in_at,
        projectCount: userProjects.length,
        lastProject: lastProject
          ? {
              name: lastProject.user_name || lastProject.niche || "ללא שם",
              status: lastProject.status,
              step: currentStep,
            }
          : null,
        niche: userNiche,
        status: userStatus,
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

    // Sort by last sign in descending
    students.sort((a, b) => {
      if (!a.lastSignIn) return 1;
      if (!b.lastSignIn) return -1;
      return (
        new Date(b.lastSignIn).getTime() - new Date(a.lastSignIn).getTime()
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
