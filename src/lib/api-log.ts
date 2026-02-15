import { supabaseAdmin } from "./supabase-admin";

/**
 * Log an API call to the api_logs table.
 * Non-blocking — failures are silently ignored.
 */
export function logApiCall(params: {
  userId?: string;
  projectId?: string;
  endpoint: string;
  status: "success" | "error";
  errorMessage?: string;
  tokensUsed?: number;
  durationMs: number;
}) {
  // Fire and forget — don't block the response
  void (async () => {
    try {
      await supabaseAdmin.from("api_logs").insert({
        user_id: params.userId || null,
        project_id: params.projectId || null,
        endpoint: params.endpoint,
        status: params.status,
        error_message: params.errorMessage || null,
        tokens_used: params.tokensUsed || 0,
        duration_ms: params.durationMs,
      });
    } catch {
      // silently ignore logging failures
    }
  })();
}
