import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Sumit webhook handler.
 * Called by Sumit after a payment is completed.
 * Updates user plan in user_profiles.
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

    console.log("Sumit webhook received:", {
      customerEmail,
      transactionId,
      amount,
      statusCode,
      rawKeys: Object.keys(body),
    });

    // Status 0 = success in Sumit
    if (statusCode !== 0 && statusCode !== 200) {
      console.log("Sumit webhook: payment not successful, status:", statusCode);
      return NextResponse.json({ received: true, processed: false });
    }

    if (!customerEmail) {
      console.error("Sumit webhook: no customer email found");
      return NextResponse.json({ received: true, processed: false });
    }

    // Find user by email
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const user = usersData?.users?.find(
      (u) => u.email?.toLowerCase() === customerEmail.toLowerCase(),
    );

    if (!user) {
      console.error("Sumit webhook: user not found for email:", customerEmail);
      return NextResponse.json({ received: true, processed: false });
    }

    // Determine plan from amount
    let plan = "standard";
    if (amount >= 180) {
      plan = "premium";
    }

    // Update user profile
    const { error: updateError } = await supabaseAdmin
      .from("user_profiles")
      .upsert(
        {
          user_id: user.id,
          plan,
          subscription_status: "active",
          plan_price: amount,
          sumit_customer_id: transactionId || undefined,
        },
        { onConflict: "user_id" },
      );

    if (updateError) {
      console.error("Sumit webhook: failed to update profile:", updateError);
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }

    console.log(`Sumit webhook: updated user ${user.email} to plan ${plan}`);
    return NextResponse.json({ received: true, processed: true });
  } catch (error) {
    console.error("Sumit webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
