import { NextRequest, NextResponse } from "next/server";
import { sendGhlWebhook } from "@/lib/ghl-webhook";

/**
 * EVENT_QUESTIONNAIRE_COMPLETED — Triggered when a user submits the questionnaire
 * and a project is created. Sends data to GoHighLevel CRM.
 * Includes UTM attribution parameters.
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email, name, user_id, registration_date,
      projectId, track, ideaName,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      utm_placement, utm_adset, utm_ad,
    } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const payload: Record<string, string> = {
      event_type: "questionnaire_completed",
      event: "EVENT_QUESTIONNAIRE_COMPLETED",
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
    if (utm_placement) payload.utm_placement = utm_placement;
    if (utm_adset) payload.utm_adset = utm_adset;
    if (utm_ad) payload.utm_ad = utm_ad;

    // Await GHL webhook delivery (critical for serverless)
    const ghl = await sendGhlWebhook("EVENT_QUESTIONNAIRE_COMPLETED", payload);

    console.log("EVENT_QUESTIONNAIRE_COMPLETED:", { email: payload.email, ghl_sent: ghl.sent, ghl_status: ghl.status });

    return NextResponse.json({ success: true, event: "EVENT_QUESTIONNAIRE_COMPLETED", ghl_delivered: ghl.sent });
  } catch (error: unknown) {
    console.error("gtm-questionnaire-completed error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook failed" },
      { status: 500 },
    );
  }
}
