import { NextRequest, NextResponse } from "next/server";

/**
 * EVENT_USER_REGISTERED — Triggered upon successful Auth/Project creation.
 * Sends data to GoHighLevel CRM for onboarding sequences.
 */

const GHL_WEBHOOK_URL = process.env.GHL_WEBHOOK_USER_REGISTERED || "";

export async function POST(req: NextRequest) {
  try {
    const { email, name, projectId, track, ideaName } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const payload = {
      event: "EVENT_USER_REGISTERED",
      email: email.trim(),
      name: name || "",
      project_id: projectId || "",
      track: track || "gtm",
      idea_name: ideaName || "",
      timestamp: new Date().toISOString(),
    };

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
