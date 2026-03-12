import { NextRequest, NextResponse } from "next/server";

/**
 * EVENT_LEAD_START — Abandonment recovery webhook
 * Triggered when a user enters their email on the Ideator/Results page.
 * Sends data to GoHighLevel CRM for follow-up sequences.
 * Includes UTM attribution parameters.
 */

const GHL_WEBHOOK_URL = process.env.GHL_WEBHOOK_LEAD_START || process.env.NEXT_PUBLIC_GHL_SMART_WEBHOOK_URL || process.env.NEXT_PUBLIC_GHL_WEBHOOK_URL || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, ideaName, category, source, utm_source, utm_medium, utm_campaign, utm_content, utm_term, utm_placement, utm_adset, utm_ad } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const payload: Record<string, string> = {
      event_type: "lead_start",
      event: "EVENT_LEAD_START",
      email: email.trim(),
      idea_name: ideaName || "",
      category: category || "",
      source: source || "gtm_ideator",
      timestamp: new Date().toISOString(),
    };

    // Attach UTM params if present
    if (utm_source) payload.utm_source = utm_source;
    if (utm_medium) payload.utm_medium = utm_medium;
    if (utm_campaign) payload.utm_campaign = utm_campaign;
    if (utm_content) payload.utm_content = utm_content;
    if (utm_term) payload.utm_term = utm_term;
    if (utm_placement) payload.utm_placement = utm_placement;
    if (utm_adset) payload.utm_adset = utm_adset;
    if (utm_ad) payload.utm_ad = utm_ad;

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
