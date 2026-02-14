import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json();

    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    // Prefer service role key (bypasses RLS); fall back to anon key + user JWT
    const key = supabaseServiceKey || supabaseAnonKey;
    const opts: { global?: { headers: Record<string, string> } } = {};

    if (!supabaseServiceKey) {
      const authHeader = req.headers.get("authorization");
      if (authHeader) {
        opts.global = { headers: { Authorization: authHeader } };
      }
    }

    const supabase = createClient(supabaseUrl, key, opts);

    const { data, error } = await supabase
      .from("projects")
      .update({ status: "completed" })
      .eq("id", projectId)
      .select("id, status");

    if (error) {
      console.error("complete-project error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "No rows updated — check RLS policies or add SUPABASE_SERVICE_ROLE_KEY to .env.local" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("complete-project exception:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
