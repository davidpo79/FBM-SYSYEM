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

    const { error } = await supabaseAdmin
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) {
      console.error("delete-project error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logApiCall({
      endpoint: "/api/delete-project",
      projectId,
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("delete-project exception:", e);

    logApiCall({
      endpoint: "/api/delete-project",
      status: "error",
      errorMessage: e instanceof Error ? e.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
