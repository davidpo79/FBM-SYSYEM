import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logApiCall } from "@/lib/api-log";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { projectId } = await req.json();

    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid projectId" },
        { status: 400 },
      );
    }

    // Fetch the original project
    const { data: original, error: fetchError } = await supabaseAdmin
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (fetchError || !original) {
      console.error("duplicate-project fetch error:", fetchError);
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      );
    }

    // Build the new project: strip fields that should be regenerated
    const { id, created_at, completed_at, share_token, ...rest } = original;

    const newProject = {
      ...rest,
      name: `${original.name} (עותק)`,
      status: "pending",
    };

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("projects")
      .insert(newProject)
      .select("id, name, user_name")
      .single();

    if (insertError) {
      console.error("duplicate-project insert error:", insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 },
      );
    }

    logApiCall({
      endpoint: "/api/duplicate-project",
      projectId,
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ project: inserted });
  } catch (e) {
    console.error("duplicate-project exception:", e);

    logApiCall({
      endpoint: "/api/duplicate-project",
      status: "error",
      errorMessage: e instanceof Error ? e.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
