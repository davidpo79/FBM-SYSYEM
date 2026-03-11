import { NextRequest, NextResponse } from "next/server";

/**
 * EVENT_BOOTCAMP_APPLICATION — Triggered when the "Apply" popup is submitted.
 * Includes phone number. Sends data to GoHighLevel CRM.
 */

const GHL_WEBHOOK_URL = process.env.GHL_WEBHOOK_BOOTCAMP_APPLICATION || "";

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, source } = await req.json();

    if (!phone || typeof phone !== "string" || phone.trim().length < 9) {
      return NextResponse.json({ error: "Missing or invalid phone number" }, { status: 400 });
    }

    const payload = {
      event: "EVENT_BOOTCAMP_APPLICATION",
      name: (name || "").trim(),
      email: (email || "").trim(),
      phone: phone.trim(),
      source: source || "gtm-strategy-page",
      timestamp: new Date().toISOString(),
    };

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
      { error: error instanceof Error ? error.message : "Webhook failed" },
      { status: 500 },
    );
  }
}
