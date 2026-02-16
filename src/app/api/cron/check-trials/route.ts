import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getTrialDaysLeft } from "@/lib/plan-limits";
import { TRIAL_NOTIFICATION_THRESHOLDS } from "@/lib/trial-utils";

/**
 * Cron job that runs daily at 09:00 (configured in vercel.json).
 * Checks all trial users and:
 * 1. Sends notifications when 3/2/1 days remain
 * 2. Marks plan as 'expired' when trial ends (0 days)
 */
export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all trial users
    const { data: trialUsers, error } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id, full_name, trial_start, trial_days, trial_notifications")
      .eq("plan", "trial");

    if (error) {
      console.error("check-trials: failed to fetch trial users:", error);
      return NextResponse.json({ error: "Failed to fetch trial users" }, { status: 500 });
    }

    if (!trialUsers || trialUsers.length === 0) {
      return NextResponse.json({ processed: 0, message: "No trial users found" });
    }

    let notificationsSent = 0;
    let trialsExpired = 0;

    for (const user of trialUsers) {
      const daysLeft = getTrialDaysLeft(user.trial_start, user.trial_days ?? 30);
      const notifications = user.trial_notifications || { day3: false, day2: false, day1: false };

      // Check if trial has expired
      if (daysLeft <= 0) {
        // Mark as expired
        await supabaseAdmin
          .from("user_profiles")
          .update({ plan: "expired" })
          .eq("user_id", user.user_id);

        // Send expiration notification
        await supabaseAdmin
          .from("admin_notifications")
          .insert({
            user_id: user.user_id,
            title: "תקופת הניסיון הסתיימה",
            message: "תקופת הניסיון שלך הסתיימה. שדרג את התוכנית שלך כדי להמשיך להשתמש במערכת.",
          });

        trialsExpired++;
        continue;
      }

      // Check notification thresholds (3, 2, 1 days)
      for (const threshold of TRIAL_NOTIFICATION_THRESHOLDS) {
        if (daysLeft <= threshold.daysLeft && !notifications[threshold.key]) {
          // Mark notification as sent
          const updatedNotifications = { ...notifications, [threshold.key]: true };
          await supabaseAdmin
            .from("user_profiles")
            .update({ trial_notifications: updatedNotifications })
            .eq("user_id", user.user_id);

          // Create in-app notification
          const dayText = threshold.daysLeft === 1
            ? "נשאר לך יום אחד"
            : `נשארו לך ${threshold.daysLeft} ימים`;

          await supabaseAdmin
            .from("admin_notifications")
            .insert({
              user_id: user.user_id,
              title: `${dayText} להתנסות`,
              message: `${dayText} להתנסות החינמית. שדרג עכשיו כדי להמשיך בלי הפרעות.`,
            });

          notificationsSent++;
          break; // Only send one notification per user per run
        }
      }
    }

    console.log(`check-trials: processed ${trialUsers.length} users, ${notificationsSent} notifications sent, ${trialsExpired} trials expired`);

    return NextResponse.json({
      processed: trialUsers.length,
      notificationsSent,
      trialsExpired,
    });
  } catch (error) {
    console.error("check-trials error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
