/**
 * Facebook (Meta) Pixel Integration
 *
 * All events include content_category for proper campaign attribution.
 * Advanced Matching sends hashed user data for better match rates.
 */

export const FB_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.NEXT_PUBLIC_FB_PIXEL_ID || "657314928924080";

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
    _fbq: (...args: unknown[]) => void;
  }
}

/**
 * Generate a unique event ID for browser↔server deduplication.
 */
export function generateEventId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Track a standard Facebook Pixel event.
 * When eventID is provided, Facebook uses it to deduplicate with server-side CAPI events.
 */
export function fbEvent(eventName: string, params?: Record<string, unknown>, eventID?: string) {
  if (typeof window !== "undefined" && window.fbq) {
    const options = eventID ? { eventID } : undefined;
    if (params && options) {
      window.fbq("track", eventName, params, options);
    } else if (params) {
      window.fbq("track", eventName, params);
    } else if (options) {
      window.fbq("track", eventName, {}, options);
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

export const fbPurchase = (value: number, currency = "ILS", contentName?: string, isSubscription = false) => {
  const eventId = generateEventId();
  fbEvent("Purchase", {
    value,
    currency,
    content_name: contentName || `GTM Plan - ${value} ${currency}`,
    content_category: "gtm_bootcamp",
    content_type: isSubscription ? "subscription" : "product",
    content_ids: [value === 290 ? "gtm_diy" : "gtm_pro"],
    num_items: 1,
    ...(isSubscription ? { predicted_ltv: value * 6 } : {}),
  }, eventId);
  return eventId;
};

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
