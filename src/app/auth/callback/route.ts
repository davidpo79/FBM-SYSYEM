import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendGhlWebhook } from "@/lib/ghl-webhook";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Save Google display name to user_profiles if not already saved
      const displayName =
        data.user.user_metadata?.full_name ||
        data.user.user_metadata?.name ||
        "";

      const track = searchParams.get("track");
      const profileData: Record<string, string> = {
        user_id: data.user.id,
        full_name: displayName || "",
      };
      if (track === "gtm") {
        profileData.track = "gtm";
      }
      if (displayName || track === "gtm") {
        await supabase.from("user_profiles").upsert(
          profileData,
          { onConflict: "user_id" },
        );
      }

      if (track === "gtm") {
        const idea = searchParams.get("idea");
        const ideaParam = idea ? "&idea=" + encodeURIComponent(idea) : "";

        // Fire EVENT_USER_REGISTERED webhook for Google OAuth GTM signups
        await sendGhlWebhook("EVENT_USER_REGISTERED", {
          event_type: "user_registered",
          event: "EVENT_USER_REGISTERED",
          email: data.user.email || "",
          full_name: displayName,
          user_id: data.user.id,
          registration_date: new Date().toISOString(),
          track: "gtm",
          idea_name: idea ? decodeURIComponent(idea) : "",
          source: "google_oauth",
          timestamp: new Date().toISOString(),
        });

        // Pass name and oauth flag to questionnaire for pixel tracking
        const nameParam = displayName ? `&name=${encodeURIComponent(displayName)}` : "";
        return NextResponse.redirect(`${origin}/questionnaire?track=gtm${ideaParam}${nameParam}&registered=google`);
      }
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  // If something went wrong, redirect to login
  return NextResponse.redirect(`${origin}/login`);
}
