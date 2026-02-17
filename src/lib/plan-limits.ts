export type PlanType = "trial" | "standard" | "premium" | "expired";

export interface PlanLimits {
  projects: number;
  aiImages: number;
  scriptsPerProject: number;
  chatMessages: number;       // daily chat messages with FBM expert
  copyVariations: number;
  videoGenerations: number;   // total AI video generations allowed
  clientReport: boolean;
  scriptBank: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  trial: {
    projects: 999,             // unlimited - let users experience the product
    aiImages: 999,             // unlimited
    scriptsPerProject: 3,
    chatMessages: 20,          // 20 daily chats with FBM expert
    copyVariations: 1,
    videoGenerations: 3,       // 3 video generations during trial
    clientReport: false,
    scriptBank: false,
  },
  standard: {
    projects: 10,
    aiImages: 30,
    scriptsPerProject: 3,
    chatMessages: 20,          // 20 daily chats with FBM expert
    copyVariations: 1,
    videoGenerations: 10,      // 10 video generations per month
    clientReport: false,
    scriptBank: false,
  },
  premium: {
    projects: 999,
    aiImages: 999,
    scriptsPerProject: 5,
    chatMessages: 999,         // unlimited chats with FBM expert
    copyVariations: 3,
    videoGenerations: 999,     // unlimited video generations
    clientReport: true,
    scriptBank: true,
  },
  expired: {
    projects: 0,
    aiImages: 0,
    scriptsPerProject: 0,
    chatMessages: 0,
    copyVariations: 0,
    videoGenerations: 0,
    clientReport: false,
    scriptBank: false,
  },
};

export const PLAN_PRICES: Record<string, number> = {
  standard: 97,
  premium: 197,
};

export const PLAN_LABELS: Record<string, string> = {
  trial: "ניסיון",
  standard: "סטנדרט",
  premium: "פרימיום",
  expired: "פג תוקף",
};

// Consulting: one-time product (not a subscription plan)
export const CONSULTING_PRODUCT = {
  type: "one-time" as const,
  price: 1000,               // before VAT
  priceWithVAT: 1180,        // including 18% VAT
  description: "שעת ייעוץ אישית עם דוד",
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan as PlanType] || PLAN_LIMITS.trial;
}

export function checkLimit(plan: string, resource: keyof PlanLimits, currentUsage: number): boolean {
  const limits = getPlanLimits(plan);
  const limit = limits[resource];
  if (typeof limit === "boolean") return limit;
  return currentUsage < limit;
}

export function isTrialExpired(trialStart: string | null, trialDays: number): boolean {
  if (!trialStart) return false;
  const start = new Date(trialStart);
  const now = new Date();
  const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff > trialDays;
}

export function getTrialDaysLeft(trialStart: string | null, trialDays: number): number {
  if (!trialStart) return trialDays;
  const start = new Date(trialStart);
  const now = new Date();
  const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, trialDays - diff);
}
