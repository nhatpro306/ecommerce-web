import { cache } from "react";
import { createServerSupabase } from "@/lib/supabase/server";

export type AdminUser = {
  id: string;
  email?: string;
};

export const requireAdmin = cache(async (): Promise<AdminUser> => {
  const supabase = await createServerSupabase();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Authentication required");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("profile_id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin" || profile.is_active === false) {
    throw new Error("Admin access required");
  }

  return { id: user.id, email: user.email };
});
