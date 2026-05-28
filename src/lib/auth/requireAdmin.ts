import { cache } from "react";
import { redirect } from "next/navigation";
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
    if (userError) {
      console.error("requireAdmin: auth.getUser failed", {
        code: userError.code,
        message: userError.message,
      });
    }
    redirect("/signin?returnTo=/admin");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("profile_id", user.id)
    .single();

  if (profileError) {
    console.error("requireAdmin: profile lookup failed", {
      userId: user.id,
      code: profileError.code,
      message: profileError.message,
      details: profileError.details,
    });
    redirect("/?error=admin_lookup_failed");
  }

  if (!profile || profile.role !== "admin" || profile.is_active === false) {
    redirect("/?error=admin_required");
  }

  return { id: user.id, email: user.email };
});
