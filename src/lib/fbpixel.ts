/**
 * Facebook (Meta) Pixel Integration
 *
 * All events include content_category for proper campaign attribution.
 * Advanced Matching sends hashed user data for better match rates.
 */

export const FB_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.NEXT_PUBLIC_FB_PIXEL_ID || "468742119653388";

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
    _fbq: (...args: unknown[]) => void;
  }
}

/**
 * Track a standard Facebook Pixel event.
 */
export function fbEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.fbq) {
    if (params) {
      window.fbq("track", eventName, params);
    } else {
      window.fbq("track", eventName);
    }
  }
}

/**
 * Track a custom Facebook Pixel event.
 */
export function fbCustomEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.fbq) {
    if (params) {
      window.fbq("trackCustom", eventName, params);
    } else {
      window.fbq("trackCustom", eventName);
    }
  }
}

/**
 * Advanced Matching — send user identity to improve match rate.
 * Call after login/signup when user email is known.
 */
export function fbSetUserData(email?: string, phone?: string) {
  if (typeof window === "undefined" || !window.fbq) return;
  const userData: Record<string, string> = {};
  if (email) userData.em = email.trim().toLowerCase();
  if (phone) userData.ph = phone.trim().replace(/[^0-9]/g, "");
  if (Object.keys(userData).length > 0) {
    window.fbq("init", FB_PIXEL_ID, userData);
  }
}

// ─── Convenience wrappers with rich event data ───

export const fbLead = (contentName: string, contentCategory = "gtm") =>
  fbEvent("Lead", {
    content_name: contentName,
    content_category: contentCategory,
  });

export const fbCompleteRegistration = (method = "email", contentCategory = "gtm") =>
  fbEvent("CompleteRegistration", {
    content_name: `Registration - ${method}`,
    content_category: contentCategory,
    status: true,
  });

export const fbInitiateCheckout = (contentName: string) =>
  fbEvent("InitiateCheckout", {
    content_name: contentName,
    content_category: "gtm_bootcamp",
    content_type: "product",
  });

export const fbPurchase = (value: number, currency = "ILS", contentName?: string, isSubscription = false) =>
  fbEvent("Purchase", {
    value,
    currency,
    content_name: contentName || `GTM Plan - ${value} ${currency}`,
    content_category: "gtm_bootcamp",
    content_type: isSubscription ? "subscription" : "product",
    content_ids: [value === 290 ? "gtm_diy" : "gtm_pro"],
    num_items: 1,
    ...(isSubscription ? { predicted_ltv: value * 6 } : {}),
  });

export const fbContact = (contentName: string) =>
  fbEvent("Contact", {
    content_name: contentName,
    content_category: "gtm",
  });

export const fbViewContent = (contentName: string, contentCategory = "gtm") =>
  fbEvent("ViewContent", {
    content_name: contentName,
    content_category: contentCategory,
  });

export const fbBootcampApplication = (contentName: string) =>
  fbCustomEvent("BootcampApplication", {
    content_name: contentName,
    content_category: "gtm_bootcamp",
  });
