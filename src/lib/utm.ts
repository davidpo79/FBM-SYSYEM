/**
 * UTM Parameter Tracking
 * Captures UTM parameters from URL and persists them in sessionStorage
 * so they survive navigation within the session.
 */

const UTM_STORAGE_KEY = "gtm_utm_params";

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  utm_placement?: string;
  utm_adset?: string;
  utm_ad?: string;
}

const UTM_KEYS: (keyof UTMParams)[] = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "utm_placement",
  "utm_adset",
  "utm_ad",
];

/**
 * Capture UTM parameters from the current URL and persist to sessionStorage.
 * Only overwrites if new UTM params are present in the URL.
 */
export function captureUTM(): UTMParams {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(window.location.search);
  const fromUrl: UTMParams = {};
  let hasNew = false;

  for (const key of UTM_KEYS) {
    const val = params.get(key);
    if (val) {
      fromUrl[key] = val;
      hasNew = true;
    }
  }

  // If we found new UTM params in the URL, save them
  if (hasNew) {
    try {
      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(fromUrl));
    } catch { /* ignore */ }
    return fromUrl;
  }

  // Otherwise return what's already stored
  return getStoredUTM();
}

/**
 * Get stored UTM parameters from sessionStorage.
 */
export function getStoredUTM(): UTMParams {
  if (typeof window === "undefined") return {};
  try {
    const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return {};
}

/**
 * Returns a flat object of UTM params suitable for webhook payloads.
 * Only includes keys that have values.
 */
export function getUTMForPayload(): Record<string, string> {
  const utm = getStoredUTM();
  const result: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    if (utm[key]) result[key] = utm[key]!;
  }
  return result;
}
