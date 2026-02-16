import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { cancelRecurringCharge, setupRecurringCharge } from "@/lib/sumit";

/**
 * Apply a 50% discount to the user's subscription for the next month.
 * Cancels the existing recurring charge and creates a new one at half price.
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

    // Get current plan price
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("plan, plan_price, subscription_status")
      .eq("user_id", user.id)
      .single();

    if (!profile || !profile.plan_price) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 400 });
    }

    if (profile.subscription_status !== "active") {
      return NextResponse.json({ error: "Subscription is not active" }, { status: 400 });
    }

    const originalPrice = profile.plan_price;
    const discountedPrice = Math.round(originalPrice / 2);
    const planLabel = profile.plan === "premium" ? "פרימיום" : "סטנדרט";

    // Cancel existing recurring charge
    const cancelResult = await cancelRecurringCharge({ customerEmail });
    if (!cancelResult.success) {
      console.error("Apply discount: failed to cancel existing recurring:", cancelResult.error);
    }

    // Set up new recurring charge at half price
    const recurringResult = await setupRecurringCharge({
      customerEmail,
      description: `FBM Studio - תוכנית ${planLabel} (מנוי חודשי - הנחה 50%)`,
      price: discountedPrice,
      intervalMonths: 1,
    });

    let recurringId = "";
    if (recurringResult.success) {
      recurringId = recurringResult.recurringId || "";
    } else {
      console.error("Apply discount: failed to set up discounted recurring:", recurringResult.error);
      return NextResponse.json({ error: "Failed to apply discount" }, { status: 500 });
    }

    // Update profile with new price
    await supabaseAdmin
      .from("user_profiles")
      .update({
        plan_price: discountedPrice,
        subscription_status: "active",
        subscription_ends_at: null,
        ...(recurringId ? { sumit_recurring_id: recurringId } : {}),
      })
      .eq("user_id", user.id);

    console.log(`Applied 50% discount for ${customerEmail}: ${originalPrice} -> ${discountedPrice}`);
    return NextResponse.json({
      success: true,
      originalPrice,
      discountedPrice,
    });
  } catch (error) {
    console.error("Apply discount error:", error);
    return NextResponse.json({ error: "Failed to apply discount" }, { status: 500 });
  }
}
