import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const ALLOWED_FIELDS = ["user_name", "status", "pipeline_data", "share_token"];

export async function POST(req: NextRequest) {
  try {
    const { projectId, updates } = await req.json();

    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid projectId" },
        { status: 400 },
      );
    }

    if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
      return NextResponse.json(
        { error: "Missing or invalid updates object" },
        { status: 400 },
      );
    }

    // Filter to only allowed fields
    const sanitized: Record<string, unknown> = {};
    for (const key of Object.keys(updates)) {
      if (ALLOWED_FIELDS.includes(key)) {
        sanitized[key] = updates[key];
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json(
        {
          error: `No valid fields to update. Allowed fields: ${ALLOWED_FIELDS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("projects")
      .update(sanitized)
      .eq("id", projectId)
      .select();

    if (error) {
      console.error("update-project error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ project: data[0] });
  } catch (e) {
    console.error("update-project exception:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
