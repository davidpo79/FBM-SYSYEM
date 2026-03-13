import { NextRequest, NextResponse } from "next/server";
import { sendGhlWebhook } from "@/lib/ghl-webhook";

/**
 * EVENT_LEAD_START — Abandonment recovery webhook
 * Triggered when a user enters their email on the Ideator/Results page.
 * Sends data to GoHighLevel CRM for follow-up sequences.
 * Includes UTM attribution parameters.
 */

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

    // Await GHL webhook delivery (critical for serverless)
    const ghl = await sendGhlWebhook("EVENT_LEAD_START", payload);

    console.log("EVENT_LEAD_START:", { email: payload.email, ghl_sent: ghl.sent, ghl_status: ghl.status });

    return NextResponse.json({ success: true, event: "EVENT_LEAD_START", ghl_delivered: ghl.sent });
  } catch (error: unknown) {
    console.error("gtm-lead-start error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook failed" },
      { status: 500 },
    );
  }
}
