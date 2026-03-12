import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, projectId, eventType, eventName, stepName, metadata, sessionId } = body;

    if (!eventType || !eventName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await supabaseAdmin.from("user_events").insert({
      user_id: userId || null,
      project_id: projectId || null,
      event_type: eventType,
      event_name: eventName,
      step_name: stepName || null,
      metadata: metadata || {},
      session_id: sessionId || null,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("track-event error:", e);
    return NextResponse.json({ error: "Failed to track event" }, { status: 500 });
  }
}
