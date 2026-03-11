import { NextRequest, NextResponse } from "next/server";

/**
 * EVENT_BOOTCAMP_APPLICATION — Triggered when the "Apply" popup is submitted.
 * Includes phone number. Sends data to GoHighLevel CRM.
 */

const GHL_WEBHOOK_URL = process.env.NEXT_PUBLIC_GHL_SMART_WEBHOOK_URL || process.env.GHL_WEBHOOK_BOOTCAMP_APPLICATION || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name, email, phone, source,
      idea_context, mrr_potential, tech_stack,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
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
      }).catch((err) => console.error("GHL EVENT_BOOTCAMP_APPLICATION webhook failed:", err));
    }

    console.log("EVENT_BOOTCAMP_APPLICATION:", payload);

    return NextResponse.json({ success: true, event: "EVENT_BOOTCAMP_APPLICATION" });
  } catch (error: unknown) {
    console.error("bootcamp-apply error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "שגיאה בשליחת המועמדות" },
      { status: 500 },
    );
  }
}
