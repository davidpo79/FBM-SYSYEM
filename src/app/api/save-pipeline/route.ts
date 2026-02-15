import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logApiCall } from "@/lib/api-log";

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { projectId, pipelineData } = await req.json();

    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    if (!pipelineData || typeof pipelineData !== "object") {
      return NextResponse.json({ error: "Missing pipelineData" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("projects")
      .update({ pipeline_data: pipelineData })
      .eq("id", projectId)
      .select("id");

    if (error) {
      console.error("save-pipeline error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    logApiCall({
      endpoint: "/api/save-pipeline",
      projectId,
      status: "success",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ success: true, saved: (data?.length ?? 0) > 0 });
  } catch (e) {
    console.error("save-pipeline exception:", e);

    logApiCall({
      endpoint: "/api/save-pipeline",
      status: "error",
      errorMessage: e instanceof Error ? e.message : "Unknown error",
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
