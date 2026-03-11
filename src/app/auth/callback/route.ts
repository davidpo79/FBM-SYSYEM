import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

      if (displayName) {
        await supabase.from("user_profiles").upsert(
          {
            user_id: data.user.id,
            full_name: displayName,
          },
          { onConflict: "user_id" },
        );
      }

      const track = searchParams.get("track");
      if (track === "gtm") {
        return NextResponse.redirect(`${origin}/questionnaire?track=gtm`);
      }
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  // If something went wrong, redirect to login
  return NextResponse.redirect(`${origin}/login`);
}
