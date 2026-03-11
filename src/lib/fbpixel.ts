/**
 * Facebook (Meta) Pixel Integration
 * Pixel ID: 657314928924080
 */

export const FB_PIXEL_ID = "657314928924080";

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

// Convenience wrappers for specific events
export const fbLead = (contentName: string) =>
  fbEvent("Lead", { content_name: contentName });

export const fbCompleteRegistration = () =>
  fbEvent("CompleteRegistration");

export const fbInitiateCheckout = (contentName: string) =>
  fbEvent("InitiateCheckout", { content_name: contentName });

export const fbPurchase = (value: number, currency = "ILS") =>
  fbEvent("Purchase", { value, currency });

export const fbContact = (contentName: string) =>
  fbEvent("Contact", { content_name: contentName });

export const fbViewContent = (contentName: string) =>
  fbEvent("ViewContent", { content_name: contentName });
