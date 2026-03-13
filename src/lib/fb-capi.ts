/**
 * Facebook Conversions API (CAPI) — Server-side event tracking.
 *
 * Sends events directly to Facebook's servers for reliable attribution,
 * complementing the browser-side Meta Pixel. Required for proper matching
 * after iOS 14.5+ and browser cookie restrictions.
 *
 * Environment variables:
 *   FB_CONVERSIONS_ACCESS_TOKEN — System user access token from Events Manager
 *   NEXT_PUBLIC_META_PIXEL_ID / NEXT_PUBLIC_FB_PIXEL_ID — Pixel/dataset ID
 */

import crypto from "crypto";

const FB_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID ||
  process.env.NEXT_PUBLIC_FB_PIXEL_ID ||
  "657314928924080";

const FB_ACCESS_TOKEN = process.env.FB_CONVERSIONS_ACCESS_TOKEN || "";

const FB_API_VERSION = "v21.0";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

interface UserData {
  email?: string;
  phone?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbc?: string;
  fbp?: string;
  externalId?: string;
}

interface EventParams {
  eventName: string;
  eventId?: string;
  userData: UserData;
  customData?: Record<string, unknown>;
  eventSourceUrl?: string;
  actionSource?: "website" | "app" | "phone_call" | "chat" | "email" | "in_store" | "other";
}

/**
 * Send a single event to Facebook Conversions API.
 */
export async function sendServerEvent(params: EventParams): Promise<{ success: boolean; error?: string }> {
  if (!FB_ACCESS_TOKEN) {
    console.warn("fb-capi: FB_CONVERSIONS_ACCESS_TOKEN not set, skipping server event");
    return { success: false, error: "no_access_token" };
  }

  const { eventName, eventId, userData, customData, eventSourceUrl, actionSource = "website" } = params;

  const hashedUserData: Record<string, unknown> = {};
  if (userData.email) hashedUserData.em = [sha256(userData.email)];
  if (userData.phone) hashedUserData.ph = [sha256(userData.phone.replace(/[^0-9]/g, ""))];
  if (userData.externalId) hashedUserData.external_id = [sha256(userData.externalId)];
  if (userData.clientIpAddress) hashedUserData.client_ip_address = userData.clientIpAddress;
  if (userData.clientUserAgent) hashedUserData.client_user_agent = userData.clientUserAgent;
  if (userData.fbc) hashedUserData.fbc = userData.fbc;
  if (userData.fbp) hashedUserData.fbp = userData.fbp;

  const eventData: Record<string, unknown> = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    action_source: actionSource,
    user_data: hashedUserData,
  };

  if (eventId) eventData.event_id = eventId;
  if (customData) eventData.custom_data = customData;
  if (eventSourceUrl) eventData.event_source_url = eventSourceUrl;

  try {
    const url = `https://graph.facebook.com/${FB_API_VERSION}/${FB_PIXEL_ID}/events`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [eventData],
        access_token: FB_ACCESS_TOKEN,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("fb-capi: API error:", result);
      return { success: false, error: JSON.stringify(result) };
    }

    console.log("fb-capi: event sent successfully:", eventName, result);
    return { success: true };
  } catch (err) {
    console.error("fb-capi: network error:", err);
    return { success: false, error: String(err) };
  }
}

/**
 * Send a Purchase event server-side.
 */
export async function sendPurchaseEvent(opts: {
  email: string;
  value: number;
  currency?: string;
  contentName?: string;
  contentIds?: string[];
  userId?: string;
  eventId?: string;
}) {
  return sendServerEvent({
    eventName: "Purchase",
    eventId: opts.eventId,
    userData: {
      email: opts.email,
      externalId: opts.userId,
    },
    customData: {
      value: opts.value,
      currency: opts.currency || "ILS",
      content_name: opts.contentName,
      content_ids: opts.contentIds || [],
      content_type: "product",
    },
    eventSourceUrl: "https://fbm-studio.com",
  });
}

/**
 * Send a Lead event server-side.
 */
export async function sendLeadEvent(opts: {
  email: string;
  contentName: string;
  contentCategory?: string;
  userId?: string;
}) {
  return sendServerEvent({
    eventName: "Lead",
    userData: {
      email: opts.email,
      externalId: opts.userId,
    },
    customData: {
      content_name: opts.contentName,
      content_category: opts.contentCategory || "gtm",
    },
    eventSourceUrl: "https://fbm-studio.com",
  });
}
