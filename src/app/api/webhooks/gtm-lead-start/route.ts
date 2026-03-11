import { NextRequest, NextResponse } from "next/server";

/**
 * EVENT_LEAD_START — Abandonment recovery webhook
 * Triggered when a user enters their email on the Ideator/Results page.
 * Sends data to GoHighLevel CRM for follow-up sequences.
 */

const GHL_WEBHOOK_URL = process.env.GHL_WEBHOOK_LEAD_START || "";

export async function POST(req: NextRequest) {
  try {
    const { email, ideaName, category, source } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const payload = {
      event: "EVENT_LEAD_START",
      email: email.trim(),
      idea_name: ideaName || "",
      category: category || "",
      source: source || "ideator",
      timestamp: new Date().toISOString(),
    };

    // Fire and forget to GHL webhook
    if (GHL_WEBHOOK_URL) {
      fetch(GHL_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch((err) => console.error("GHL EVENT_LEAD_START webhook failed:", err));
    }

    console.log("EVENT_LEAD_START:", payload);

    return NextResponse.json({ success: true, event: "EVENT_LEAD_START" });
  } catch (error: unknown) {
    console.error("gtm-lead-start error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook failed" },
      { status: 500 },
    );
  }
}
