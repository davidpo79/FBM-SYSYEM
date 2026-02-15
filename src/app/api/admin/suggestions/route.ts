import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    // Fetch all improvement suggestions
    const { data: suggestions, error: sugError } = await supabaseAdmin
      .from("improvement_suggestions")
      .select("*")
      .order("created_at", { ascending: false });

    if (sugError) {
      console.error("admin/suggestions - query error:", sugError);
      return NextResponse.json(
        { error: "שגיאה בשליפת הצעות שיפור" },
        { status: 500 },
      );
    }

    const allSuggestions = suggestions ?? [];

    // Enrich with user names from auth.users
    const userIds = [
      ...new Set(
        allSuggestions
          .map((s) => s.user_id)
          .filter((id): id is string => !!id),
      ),
    ];

    let userMap: Record<string, { email: string; fullName: string }> = {};
    if (userIds.length > 0) {
      const { data: usersData } =
        await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      if (usersData?.users) {
        for (const u of usersData.users) {
          userMap[u.id] = {
            email: u.email || "",
            fullName:
              u.user_metadata?.full_name ||
              u.user_metadata?.name ||
              u.email ||
              "",
          };
        }
      }
    }

    const enrichedSuggestions = allSuggestions.map((s) => ({
      id: s.id,
      userId: s.user_id,
      userEmail: userMap[s.user_id]?.email || null,
      userName: userMap[s.user_id]?.fullName || null,
      suggestion: s.suggestion,
      category: s.category || null,
      status: s.status || "new",
      createdAt: s.created_at,
    }));

    return NextResponse.json({ suggestions: enrichedSuggestions });
  } catch (e) {
    console.error("admin/suggestions exception:", e);
    return NextResponse.json(
      { error: "שגיאה בשליפת הצעות שיפור" },
      { status: 500 },
    );
  }
}
