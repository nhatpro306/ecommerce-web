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

export type DeleteOrderResult =
  | { status: "deleted" }
  | { status: "cancelled"; reason: string };

/**
 * Delete an order. To protect historical records we only hard-delete orders
 * that are already in a "cancelled" state. Otherwise we cancel the order and
 * keep the row so the customer's history stays intact.
 */
export async function deleteAdminOrderAction(
  orderId: number,
): Promise<DeleteOrderResult> {
  await requireAdmin();
  const supabase = await createServerSupabase();

  const { data: existing, error: fetchError } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!existing) {
    throw new Error("Không tìm thấy đơn hàng.");
  }

  if (existing.status !== "cancelled") {
    const { error: cancelError } = await supabase
      .from("orders")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", orderId);

    if (cancelError) {
      throw new Error(cancelError.message);
    }

    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    return {
      status: "cancelled",
      reason:
        "Đơn hàng có dữ liệu liên quan, nên hệ thống sẽ chuyển sang trạng thái đã hủy thay vì xóa vĩnh viễn.",
    };
  }

  // Order is already cancelled — safe to remove it. order_items cascade on
  // delete, addresses are kept (shipping_address_id uses ON DELETE RESTRICT
  // on the address side, not the order side).
  const { error: deleteError } = await supabase
    .from("orders")
    .delete()
    .eq("id", orderId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { status: "deleted" };
}
