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
      .select("plan, trial_start, trial_days, subscription_status, plan_price")
      .eq("user_id", user.id)
      .single();

    const plan = profile?.plan || "trial";
    const trialStart = profile?.trial_start || null;
    const trialDays = profile?.trial_days ?? 30;
    const subscriptionStatus = profile?.subscription_status || "none";

    const trialExpired = plan === "trial" && isTrialExpired(trialStart, trialDays);
    const daysLeft = plan === "trial" ? getTrialDaysLeft(trialStart, trialDays) : null;

    // If trial expired and no active subscription, mark as expired
    const effectivePlan = trialExpired && subscriptionStatus !== "active" ? "expired" : plan;

    return NextResponse.json({
      plan: effectivePlan,
      daysLeft,
      isTrialExpired: trialExpired,
      subscriptionStatus,
      planPrice: profile?.plan_price || 0,
    });
  } catch (error) {
    console.error("billing/status error:", error);
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}
