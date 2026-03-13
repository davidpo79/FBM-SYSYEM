import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendPurchaseEvent } from "@/lib/fb-capi";

/**
 * Sumit webhook handler for consulting payments.
 * Creates a record in the consultations table when payment succeeds.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Extract payment details from Sumit webhook payload
    const customerEmail = body?.Customer?.EmailAddress
      || body?.CustomerEmail
      || body?.customer_email
      || "";
    const transactionId = body?.TransactionID
      || body?.Data?.TransactionID
      || body?.transaction_id
      || "";
    const amount = body?.Amount
      || body?.Data?.Amount
      || body?.Items?.[0]?.Price
      || 0;
    const statusCode = body?.StatusCode ?? body?.Data?.StatusCode ?? body?.Status ?? -1;

    console.log("Consultation webhook received:", {
      customerEmail,
      transactionId,
      amount,
      statusCode,
    });

    // Status 0 = success in Sumit
    if (statusCode !== 0 && statusCode !== 200) {
      console.log("Consultation webhook: payment not successful, status:", statusCode);
      return NextResponse.json({ received: true, processed: false });
    }

    if (!customerEmail) {
      console.error("Consultation webhook: no customer email found");
      return NextResponse.json({ received: true, processed: false });
    }

    // Find user by email
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const user = usersData?.users?.find(
      (u) => u.email?.toLowerCase() === customerEmail.toLowerCase(),
    );

    if (!user) {
      console.error("Consultation webhook: user not found for email:", customerEmail);
      return NextResponse.json({ received: true, processed: false });
    }

    // Create consultation record
    const { error: insertError } = await supabaseAdmin
      .from("consultations")
      .insert({
        user_id: user.id,
        transaction_id: transactionId || null,
        amount: amount || 1170,
        status: "pending",
      });

    if (insertError) {
      console.error("Consultation webhook: failed to insert consultation:", insertError);
      return NextResponse.json({ error: "Failed to create consultation" }, { status: 500 });
    }

    // Create admin notification (best-effort)
    try {
      await supabaseAdmin
        .from("admin_notifications")
        .insert({
          type: "consultation_purchased",
          title: "שעת ייעוץ חדשה נרכשה",
          message: `${user.email} רכש/ה שעת ייעוץ`,
          metadata: { userId: user.id, email: user.email, transactionId },
        });
    } catch {
      // non-critical, ignore
    }

    // Send server-side Purchase event to Facebook Conversions API
    sendPurchaseEvent({
      email: customerEmail,
      value: amount || 1170,
      currency: "ILS",
      contentName: "Consultation Hour",
      contentIds: ["consultation"],
      userId: user.id,
    }).catch((err) => console.error("fb-capi: Consultation purchase event failed:", err));

    console.log(`Consultation webhook: created consultation for ${user.email}`);
    return NextResponse.json({ received: true, processed: true });
  } catch (error) {
    console.error("Consultation webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
