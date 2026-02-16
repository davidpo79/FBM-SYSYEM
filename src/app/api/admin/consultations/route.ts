import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    // Fetch all consultations with user info
    const { data: consultations, error } = await supabaseAdmin
      .from("consultations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("admin/consultations GET error:", error);
      return NextResponse.json({ error: "שגיאה בשליפת נתונים" }, { status: 500 });
    }

    // Get user emails and names
    const userIds = [...new Set((consultations || []).map((c) => c.user_id))];
    const { data: profiles } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const emailMap: Record<string, string> = {};
    if (usersData?.users) {
      for (const u of usersData.users) {
        emailMap[u.id] = u.email || "";
      }
    }

    const nameMap: Record<string, string> = {};
    if (profiles) {
      for (const p of profiles) {
        nameMap[p.user_id] = p.full_name || "";
      }
    }

    const enriched = (consultations || []).map((c) => ({
      ...c,
      userName: nameMap[c.user_id] || "",
      userEmail: emailMap[c.user_id] || "",
    }));

    return NextResponse.json({ consultations: enriched });
  } catch (e) {
    console.error("admin/consultations exception:", e);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, scheduled_date, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing consultation id" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (scheduled_date !== undefined) updateData.scheduled_date = scheduled_date;
    if (notes !== undefined) updateData.notes = notes;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("consultations")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("admin/consultations PATCH error:", error);
      return NextResponse.json({ error: "שגיאה בעדכון" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("admin/consultations PATCH exception:", e);
    return NextResponse.json({ error: "שגיאה" }, { status: 500 });
  }
}
