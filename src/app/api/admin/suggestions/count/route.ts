import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const { count, error } = await supabaseAdmin
      .from("improvement_suggestions")
      .select("*", { count: "exact", head: true })
      .eq("status", "new");

    if (error) {
      console.error("admin/suggestions/count error:", error);
      return NextResponse.json({ count: 0 });
    }

    return NextResponse.json({ count: count ?? 0 });
  } catch (e) {
    console.error("admin/suggestions/count exception:", e);
    return NextResponse.json({ count: 0 });
  }
}
