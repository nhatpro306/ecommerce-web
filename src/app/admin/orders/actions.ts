"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createServerSupabase } from "@/lib/supabase/server";
import type { OrderType } from "@/types";

const validStatuses = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export async function updateAdminOrderStatusAction(
  orderId: number,
  status: string,
): Promise<OrderType> {
  await requireAdmin();

  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid order status: ${status}`);
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return data as OrderType;
}
