import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    // Fetch all user profiles with plan info
    const { data: profiles, error } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id, full_name, plan, trial_start, trial_days, subscription_status, plan_price, sumit_customer_id");

    if (error) {
      console.error("admin/subscriptions GET error:", error);
      return NextResponse.json({ error: "שגיאה בשליפת נתונים" }, { status: 500 });
    }

    // Fetch user emails from auth
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const emailMap: Record<string, string> = {};
    if (usersData?.users) {
      for (const u of usersData.users) {
        emailMap[u.id] = u.email || "";
      }
    }

    const subscriptions = (profiles || []).map((p) => ({
      userId: p.user_id,
      fullName: p.full_name || "",
      email: emailMap[p.user_id] || "",
      plan: p.plan || "trial",
      trialStart: p.trial_start || null,
      trialDays: p.trial_days ?? 30,
      subscriptionStatus: p.subscription_status || "none",
      planPrice: p.plan_price || 0,
      hasSumitId: !!p.sumit_customer_id,
    }));

    return NextResponse.json({ subscriptions });
  } catch (e) {
    console.error("admin/subscriptions exception:", e);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, action, plan, extraDays } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (action === "change-plan" && plan) {
      const updateData: Record<string, unknown> = { plan };
      if (plan === "standard" || plan === "premium") {
        updateData.subscription_status = "active";
        updateData.plan_price = plan === "standard" ? 97 : 197;
      } else if (plan === "trial") {
        updateData.subscription_status = "none";
        updateData.plan_price = 0;
        // Reset trial start to now
        updateData.trial_start = new Date().toISOString();
      }

      const { error } = await supabaseAdmin
        .from("user_profiles")
        .update(updateData)
        .eq("user_id", userId);

      if (error) {
        console.error("change-plan error:", error);
        return NextResponse.json({ error: "שגיאה בעדכון תוכנית" }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === "extend-trial" && extraDays) {
      // Get current trial_days
      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("trial_days, plan")
        .eq("user_id", userId)
        .single();

      const currentDays = profile?.trial_days ?? 30;
      const newDays = currentDays + Number(extraDays);

      const updateData: Record<string, unknown> = { trial_days: newDays };
      // If plan was expired, revert to trial
      if (profile?.plan === "expired") {
        updateData.plan = "trial";
      }

      const { error } = await supabaseAdmin
        .from("user_profiles")
        .update(updateData)
        .eq("user_id", userId);

      if (error) {
        console.error("extend-trial error:", error);
        return NextResponse.json({ error: "שגיאה בהארכת ניסיון" }, { status: 500 });
      }

      return NextResponse.json({ success: true, newTrialDays: newDays });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error("admin/subscriptions PATCH exception:", e);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}
