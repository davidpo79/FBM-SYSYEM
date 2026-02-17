import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isTrialExpired, getTrialDaysLeft } from "@/lib/plan-limits";

export async function GET(req: NextRequest) {
  try {
    // Get current user from Authorization header
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("plan, trial_start, trial_days, subscription_status, subscription_ends_at, plan_price")
      .eq("user_id", user.id)
      .single();

    let plan = profile?.plan || "trial";
    const trialStart = profile?.trial_start || null;
    const trialDays = profile?.trial_days ?? 30;
    let subscriptionStatus = profile?.subscription_status || "none";

    // Check if a "cancelling" subscription has reached its end date
    if (subscriptionStatus === "cancelling" && profile?.subscription_ends_at) {
      const endsAt = new Date(profile.subscription_ends_at);
      if (new Date() > endsAt) {
        // Period ended - downgrade to trial
        plan = "trial";
        subscriptionStatus = "cancelled";
        // Update DB in background
        supabaseAdmin
          .from("user_profiles")
          .update({ plan: "trial", subscription_status: "cancelled", plan_price: 0 })
          .eq("user_id", user.id)
          .then(({ error: e }) => { if (e) console.error("Auto-downgrade error:", e); });
      }
    }

    const trialExpired = plan === "trial" && isTrialExpired(trialStart, trialDays);
    const daysLeft = plan === "trial" ? getTrialDaysLeft(trialStart, trialDays) : null;

    // If trial expired and no active/cancelling subscription, mark as expired
    const effectivePlan = trialExpired && subscriptionStatus !== "active" && subscriptionStatus !== "cancelling"
      ? "expired"
      : plan;

    return NextResponse.json({
      plan: effectivePlan,
      daysLeft,
      isTrialExpired: trialExpired,
      subscriptionStatus,
      subscriptionEndsAt: subscriptionStatus === "cancelling" ? profile?.subscription_ends_at : null,
      planPrice: profile?.plan_price || 0,
    });
  } catch (error) {
    console.error("billing/status error:", error);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}
