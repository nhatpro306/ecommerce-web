"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createServerSupabase } from "@/lib/supabase/server";
import type { OrderType } from "@/types";
import type {
  OrderFilters,
  OrderWithDetails,
} from "@/services/admin/adminOrderService";

const validStatuses = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

function applyOrderFilters<T extends { eq: Function; gte: Function; lte: Function }>(
  query: T,
  filters: OrderFilters,
): T {
  let nextQuery = query;

  if (filters.status) nextQuery = nextQuery.eq("status", filters.status) as T;
  if (filters.dateFrom) nextQuery = nextQuery.gte("created_at", filters.dateFrom) as T;
  if (filters.dateTo) nextQuery = nextQuery.lte("created_at", filters.dateTo) as T;

  return nextQuery;
}

export async function getAdminOrdersAction(
  filters: OrderFilters = {},
  page: number = 1,
  limit: number = 20,
): Promise<{ orders: OrderWithDetails[]; total: number }> {
  await requireAdmin();
  const supabase = await createServerSupabase();

  let query = supabase.from("orders").select(`
    *,
    profiles!orders_user_id_fkey (
      username,
      email
    ),
    addresses!orders_shipping_address_id_fkey (
      street,
      city,
      state,
      zip_code,
      country
    ),
    order_items (
      id,
      order_id,
      product_id,
      variant_id,
      quantity,
      price,
      selected_size,
      selected_color,
      product_title_snapshot,
      product_image_snapshot,
      sku_snapshot,
      size_snapshot,
      color_snapshot,
      products (
        product_id,
        title,
        image
      )
    )
  `);
  query = applyOrderFilters(query, filters);

  let countQuery = supabase
    .from("orders")
    .select("id", { count: "exact", head: true });
  countQuery = applyOrderFilters(countQuery, filters);

  const [{ count, error: countError }, { data, error }] = await Promise.all([
    countQuery,
    query
      .order("created_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1),
  ]);

  if (countError) {
    throw new Error(
      [countError.code, countError.message, countError.details].filter(Boolean).join(" — "),
    );
  }

  if (error) {
    throw new Error(
      [error.code, error.message, error.details].filter(Boolean).join(" — "),
    );
  }

  return {
    orders: (data || []) as unknown as OrderWithDetails[],
    total: count || 0,
  };
}

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
