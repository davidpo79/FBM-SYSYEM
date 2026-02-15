import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logApiCall } from "@/lib/api-log";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { projectId } = await req.json();

    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("projects")
      .update({ status: "completed" })
      .eq("id", projectId)
      .select("id, status");

    if (error) {
      console.error("complete-project error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    logApiCall({
      endpoint: "/api/complete-project",
      projectId,
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("complete-project exception:", e);

    logApiCall({
      endpoint: "/api/complete-project",
      status: "error",
      errorMessage: e instanceof Error ? e.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
