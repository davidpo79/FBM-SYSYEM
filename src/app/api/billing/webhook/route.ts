import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PLAN_PRICES } from "@/lib/plan-limits";
import { setupRecurringCharge } from "@/lib/sumit";

/**
 * Sumit webhook handler.
 * Called by Sumit after a payment is completed.
 * Updates user plan and sets up recurring monthly billing.
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
      || body?.Items?.[0]?.UnitPrice
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
    let planPrice = PLAN_PRICES.standard;
    if (amount >= PLAN_PRICES.premium) {
      plan = "premium";
      planPrice = PLAN_PRICES.premium;
    }

    const planLabel = plan === "premium" ? "פרימיום" : "סטנדרט";

    // Set up recurring monthly charge using customer's saved payment method
    let recurringId = "";
    try {
      const recurringResult = await setupRecurringCharge({
        customerEmail,
        description: `FBM Studio - תוכנית ${planLabel} (מנוי חודשי)`,
        price: planPrice,
        intervalMonths: 1,
      });

      if (recurringResult.success) {
        recurringId = recurringResult.recurringId || "";
        console.log(`Sumit webhook: recurring charge set up for ${customerEmail}, ID: ${recurringId}`);
      } else {
        console.error("Sumit webhook: failed to set up recurring:", recurringResult.error);
      }
    } catch (recurringError) {
      console.error("Sumit webhook: recurring charge setup error:", recurringError);
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
          ...(recurringId ? { sumit_recurring_id: recurringId } : {}),
        },
        { onConflict: "user_id" },
      );

    if (updateError) {
      console.error("Sumit webhook: failed to update profile:", updateError);
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }

    console.log(`Sumit webhook: updated user ${user.email} to plan ${plan} (recurring: ${recurringId || "none"})`);
    return NextResponse.json({ received: true, processed: true });
  } catch (error) {
    console.error("Sumit webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
