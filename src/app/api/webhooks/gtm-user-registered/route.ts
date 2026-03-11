import { NextRequest, NextResponse } from "next/server";

/**
 * EVENT_USER_REGISTERED — Triggered upon successful Supabase Auth signup.
 * Sends data to GoHighLevel CRM for onboarding sequences.
 * Includes UTM attribution parameters.
 */

const GHL_WEBHOOK_URL = process.env.NEXT_PUBLIC_GHL_SMART_WEBHOOK_URL || process.env.GHL_WEBHOOK_USER_REGISTERED || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email, name, user_id, registration_date,
      projectId, track, ideaName,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const payload: Record<string, string> = {
      event_type: "user_registered",
      event: "EVENT_USER_REGISTERED",
      email: email.trim(),
      full_name: (name || "").trim(),
      user_id: user_id || "",
      registration_date: registration_date || new Date().toISOString(),
      project_id: projectId || "",
      track: track || "gtm",
      idea_name: ideaName || "",
      timestamp: new Date().toISOString(),
    };

    // Attach UTM params if present
    if (utm_source) payload.utm_source = utm_source;
    if (utm_medium) payload.utm_medium = utm_medium;
    if (utm_campaign) payload.utm_campaign = utm_campaign;
    if (utm_content) payload.utm_content = utm_content;
    if (utm_term) payload.utm_term = utm_term;

    // Fire and forget to GHL webhook
    if (GHL_WEBHOOK_URL) {
      fetch(GHL_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch((err) => console.error("GHL EVENT_USER_REGISTERED webhook failed:", err));
    }

    console.log("EVENT_USER_REGISTERED:", payload);

    return NextResponse.json({ success: true, event: "EVENT_USER_REGISTERED" });
  } catch (error: unknown) {
    console.error("gtm-user-registered error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook failed" },
      { status: 500 },
    );
  }
}
