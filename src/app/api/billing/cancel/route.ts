import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { cancelRecurringCharge } from "@/lib/sumit";

/**
 * Cancel a user's subscription.
 * Cancels the recurring charge in Sumit but keeps the plan active
 * until the end of the current billing period (30 days from last charge).
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customerEmail = user.email || "";
    if (!customerEmail) {
      return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    // Cancel recurring charge in Sumit
    const cancelResult = await cancelRecurringCharge({ customerEmail });
    if (!cancelResult.success) {
      console.error("Cancel subscription: Sumit cancel failed:", cancelResult.error);
      // Continue anyway to update our DB - the admin can cancel manually in Sumit if needed
    }

    // Keep plan active until end of billing period (30 days from now)
    const subscriptionEndsAt = new Date();
    subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + 30);

    const { error: updateError } = await supabaseAdmin
      .from("user_profiles")
      .update({
        subscription_status: "cancelling",
        subscription_ends_at: subscriptionEndsAt.toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Cancel subscription: DB update failed:", updateError);
      return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
    }

    console.log(`Subscription cancelling for ${customerEmail}, active until ${subscriptionEndsAt.toISOString()}`);
    return NextResponse.json({
      success: true,
      endsAt: subscriptionEndsAt.toISOString(),
    });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }
}
