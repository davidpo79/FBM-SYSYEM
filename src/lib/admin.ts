import { supabase } from "./supabase";

/**
 * Client-side admin check — queries admin_users table.
 * Works because supabase client has the user's session from localStorage.
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .single();

    return !!data;
  } catch {
    return false;
  }
}
