export type PlanType = "trial" | "standard" | "premium" | "expired" | "coaching";

export interface PlanLimits {
  projects: number;
  aiImages: number;
  scriptsPerProject: number;
  chatMessages: number;
  copyVariations: number;
  clientReport: boolean;
  scriptBank: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  trial: {
    projects: 999,
    aiImages: 999,
    scriptsPerProject: 3,
    chatMessages: 999,
    copyVariations: 1,
    clientReport: false,
    scriptBank: false,
  },
  standard: {
    projects: 10,
    aiImages: 30,
    scriptsPerProject: 3,
    chatMessages: 20,
    copyVariations: 1,
    clientReport: false,
    scriptBank: false,
  },
  premium: {
    projects: 999,
    aiImages: 999,
    scriptsPerProject: 5,
    chatMessages: 999,
    copyVariations: 3,
    clientReport: true,
    scriptBank: true,
  },
  expired: {
    projects: 0,
    aiImages: 0,
    scriptsPerProject: 0,
    chatMessages: 0,
    copyVariations: 0,
    clientReport: false,
    scriptBank: false,
  },
  coaching: {
    projects: 999,
    aiImages: 999,
    scriptsPerProject: 5,
    chatMessages: 999,
    copyVariations: 3,
    clientReport: true,
    scriptBank: true,
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
  coaching: "קואצ'ינג",
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
