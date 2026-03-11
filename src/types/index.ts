import type { PlanType } from "@/lib/plan-limits";

export type TrackType = "fbm" | "gtm";

export type SubscriptionStatus = "none" | "active" | "cancelling" | "cancelled";

export interface TrialNotifications {
  day3: boolean;
  day2: boolean;
  day1: boolean;
}

export interface UserProfile {
  user_id: string;
  full_name: string;
  plan: PlanType;
  trial_start: string | null;
  trial_days: number;
  subscription_status: SubscriptionStatus;
  plan_price: number;
  sumit_customer_id: string | null;
  sumit_recurring_id: string | null;
  subscription_ends_at: string | null;
  trial_notifications: TrialNotifications;
  created_at: string;
  updated_at: string;
}

export type { PlanType };

export type BackgroundType = "lighthouse" | "mountain" | "path" | "office" | "city" | "sunset" | "forest" | "studio";
export type ColorType = "gold" | "teal";
export type FontSizeType = "small" | "medium" | "large";
export type TextPositionType = "top" | "center" | "bottom";
export type FormatType = "feed" | "story";

export interface CreativeSuggestion {
  main_text: string;
  pilot_subtitle?: string;
  cta: string;
  background: BackgroundType;
  color: ColorType;
  reasoning: string;
  look_and_feel?: string;
  image_prompt?: string;
}

export interface CreativeConfig {
  mainText: string;
  subtitle?: string;
  cta: string;
  background: BackgroundType;
  color: ColorType;
  userInfo: {
    name: string;
    role: string;
    niche: string;
  };
  format?: FormatType;
  fontSize?: FontSizeType;
  textPosition?: TextPositionType;
  showProfile?: boolean;
  profileImage?: string;
  displayName?: string;
  displayRole?: string;
  designVision?: string;
}

export interface CreativeResponse {
  success: boolean;
  imageUrl: string;
  imageBase64?: string;
  metadata: {
    main_text: string;
    cta: string;
    background_type: string;
  };
}
