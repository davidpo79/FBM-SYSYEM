import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { cancelRecurringCharge } from "@/lib/sumit";

/**
 * Cancel a user's subscription.
 * Cancels the recurring charge in Sumit and updates the user's plan.
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

    // Update user profile to cancelled
    const { error: updateError } = await supabaseAdmin
      .from("user_profiles")
      .update({
        subscription_status: "cancelled",
        plan: "trial",
        plan_price: 0,
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Cancel subscription: DB update failed:", updateError);
      return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
    }

    console.log(`Subscription cancelled for ${customerEmail}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }
}
