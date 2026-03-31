import { supabase } from "./supabase";

let _sessionId: string | null = null;

function getSessionId(): string {
  if (_sessionId) return _sessionId;
  if (typeof window === "undefined") return "server";
  let sid = sessionStorage.getItem("fbm-session-id");
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem("fbm-session-id", sid);
  }
  _sessionId = sid;
  return sid;
}

let _cachedUserId: string | null = null;

async function getUserId(): Promise<string | null> {
  if (_cachedUserId) return _cachedUserId;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    _cachedUserId = user?.id ?? null;
    return _cachedUserId;
  } catch {
    return null;
  }
}

/**
 * Track a user event — non-blocking, fire-and-forget.
 */
export function trackEvent(params: {
  eventType: "page_view" | "button_click" | "generation_start" | "generation_complete" | "step_complete" | "error" | "interaction";
  eventName: string;
  stepName?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
}) {
  void (async () => {
    try {
      const userId = await getUserId();
      const sessionId = getSessionId();

      await fetch("/api/track-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          projectId: params.projectId || null,
          eventType: params.eventType,
          eventName: params.eventName,
          stepName: params.stepName || null,
          metadata: params.metadata || {},
          sessionId,
        }),
      });
    } catch {
      // silently ignore tracking failures
    }
  })();
}
