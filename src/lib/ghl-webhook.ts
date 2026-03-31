/**
 * GoHighLevel Webhook Utility
 * Centralised, reliable webhook delivery with:
 * - Proper await (critical for serverless environments)
 * - Response status logging
 * - Single retry on failure
 * - Env-var validation with warnings
 */

const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 1500;

function getGhlWebhookUrl(): string {
  // Support both server-only and NEXT_PUBLIC_ variants
  return process.env.GHL_WEBHOOK_URL || process.env.NEXT_PUBLIC_GHL_WEBHOOK_URL || "";
}

export interface GhlWebhookResult {
  sent: boolean;
  status?: number;
  error?: string;
}

/**
 * Send a payload to GoHighLevel webhook with retry logic.
 * MUST be awaited — never fire-and-forget in serverless.
 */
export async function sendGhlWebhook(
  eventName: string,
  payload: Record<string, string>,
): Promise<GhlWebhookResult> {
  const url = getGhlWebhookUrl();

  if (!url) {
    console.warn(`[GHL] ⚠ Webhook URL not configured — skipping ${eventName}. Set GHL_WEBHOOK_URL env var.`);
    return { sent: false, error: "GHL_WEBHOOK_URL not configured" };
  }

  const body = JSON.stringify(payload);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (res.ok) {
        console.log(`[GHL] ✓ ${eventName} delivered (${res.status})`);
        return { sent: true, status: res.status };
      }

      // Non-OK response
      const resText = await res.text().catch(() => "");
      console.error(
        `[GHL] ✗ ${eventName} failed (HTTP ${res.status}): ${resText.slice(0, 300)}`
      );

      // Don't retry on 4xx client errors (except 429 rate limit)
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        return { sent: false, status: res.status, error: `HTTP ${res.status}: ${resText.slice(0, 200)}` };
      }

      // Retry on 5xx or 429
      if (attempt < MAX_RETRIES) {
        console.log(`[GHL] Retrying ${eventName} in ${RETRY_DELAY_MS}ms (attempt ${attempt + 2}/${MAX_RETRIES + 1})...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      } else {
        return { sent: false, status: res.status, error: `HTTP ${res.status} after ${MAX_RETRIES + 1} attempts` };
      }
    } catch (err) {
      console.error(`[GHL] ✗ ${eventName} network error (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, err);
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      } else {
        return { sent: false, error: err instanceof Error ? err.message : "Network error" };
      }
    }
  }

  return { sent: false, error: "Exhausted retries" };
}
