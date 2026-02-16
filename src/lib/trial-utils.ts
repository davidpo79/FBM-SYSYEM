import type { TrialNotifications } from "@/types";

/**
 * Trial notification thresholds (days remaining).
 * Each key maps to the corresponding field in trial_notifications JSONB.
 */
export const TRIAL_NOTIFICATION_THRESHOLDS = [
  { daysLeft: 3, key: "day3" as const },
  { daysLeft: 2, key: "day2" as const },
  { daysLeft: 1, key: "day1" as const },
];

/**
 * Determine which trial notification should be shown (if any).
 * Returns the notification key ("day3" | "day2" | "day1") or null.
 */
export function getActiveTrialNotification(
  daysLeft: number,
  notifications: TrialNotifications | null
): keyof TrialNotifications | null {
  if (daysLeft > 3 || daysLeft <= 0) return null;

  for (const threshold of TRIAL_NOTIFICATION_THRESHOLDS) {
    if (daysLeft <= threshold.daysLeft) {
      const alreadySent = notifications?.[threshold.key] ?? false;
      if (!alreadySent) return threshold.key;
    }
  }

  // All relevant notifications already sent, show the most recent
  if (daysLeft <= 3) {
    if (daysLeft === 1) return "day1";
    if (daysLeft === 2) return "day2";
    return "day3";
  }

  return null;
}

/**
 * Get the Hebrew message for a trial notification.
 */
export function getTrialNotificationMessage(daysLeft: number): string {
  if (daysLeft === 1) return "נשאר לך יום אחד להתנסות החינמית!";
  if (daysLeft === 2) return "נשארו לך יומיים להתנסות החינמית";
  if (daysLeft === 3) return "נשארו לך 3 ימים להתנסות החינמית";
  if (daysLeft <= 0) return "תקופת הניסיון הסתיימה";
  return `נשארו לך ${daysLeft} ימי ניסיון`;
}

/**
 * Check whether the trial banner should be displayed.
 */
export function shouldShowTrialBanner(
  plan: string,
  daysLeft: number | null
): boolean {
  return plan === "trial" && daysLeft !== null && daysLeft > 0 && daysLeft <= 3;
}
