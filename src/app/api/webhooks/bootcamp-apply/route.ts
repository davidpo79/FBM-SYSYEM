import { NextRequest, NextResponse } from "next/server";
import { sendGhlWebhook } from "@/lib/ghl-webhook";

/**
 * EVENT_BOOTCAMP_APPLICATION — Triggered when the "Apply" popup is submitted.
 * Includes phone number. Sends data to GoHighLevel CRM.
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name, email, phone, source,
      idea_context, mrr_potential, tech_stack,
      payment_level,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      utm_placement, utm_adset, utm_ad,
    } = body;

    if (!phone || typeof phone !== "string" || phone.trim().length < 9) {
      return NextResponse.json({ error: "נא להזין מספר טלפון תקין" }, { status: 400 });
    }

    const payload: Record<string, string> = {
      event_type: "bootcamp_app",
      event: "EVENT_BOOTCAMP_APPLICATION",
      full_name: (name || "").trim(),
      email: (email || "").trim(),
      phone: phone.trim(),
      source: source || "gtm-strategy-page",
      idea_context: idea_context || "",
      mrr_potential: mrr_potential || "",
      tech_stack: tech_stack || "",
      payment_level: payment_level || "free",
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
    const ghl = await sendGhlWebhook("EVENT_BOOTCAMP_APPLICATION", payload);

    console.log("EVENT_BOOTCAMP_APPLICATION:", { phone: payload.phone, ghl_sent: ghl.sent, ghl_status: ghl.status });

    return NextResponse.json({ success: true, event: "EVENT_BOOTCAMP_APPLICATION", ghl_delivered: ghl.sent });
  } catch (error: unknown) {
    console.error("bootcamp-apply error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "שגיאה בשליחת המועמדות" },
      { status: 500 },
    );
  }
}
