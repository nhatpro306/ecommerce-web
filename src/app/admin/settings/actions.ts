"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createServerSupabase } from "@/lib/supabase/server";
import { storeSettingsSchema, StoreSettingsInput } from "@/lib/validation/schemas";
import type { StoreSettingsType } from "@/types";

export async function getAdminStoreSettingsAction(): Promise<StoreSettingsType> {
  await requireAdmin();
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("store_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as StoreSettingsType;
}

export async function updateAdminStoreSettingsAction(
  input: StoreSettingsInput,
): Promise<StoreSettingsType> {
  await requireAdmin();
  const parsed = storeSettingsSchema.parse(input);
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("store_settings")
    .upsert({
      id: 1,
      ...parsed,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/settings");
  revalidatePath("/checkout");
  revalidatePath("/");
  return data as StoreSettingsType;
}
