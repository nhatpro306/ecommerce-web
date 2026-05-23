"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createServerSupabase } from "@/lib/supabase/server";
import { productVariantSchema } from "@/lib/validation/schemas";
import type {
  CreateProductData,
  UpdateProductData,
} from "@/services/admin/adminProductService";
import type { ProductType, ProductVariantType } from "@/types";

export interface AdminVariantInput {
  id?: string;
  size: string;
  color: string;
  sku?: string | null;
  stock: number;
  price_override?: number | null;
  image_url?: string | null;
  is_active: boolean;
}

function isMissingVariantTableError(error: { code?: string; message?: string }) {
  const message = `${error.code || ""} ${error.message || ""}`.toLowerCase();
  return (
    message.includes("product_variants") ||
    message.includes("schema cache") ||
    message.includes("does not exist") ||
    message.includes("pgrst200") ||
    message.includes("42p01")
  );
}

export async function createAdminProductAction(
  productData: CreateProductData,
): Promise<ProductType> {
  await requireAdmin();
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("products")
    .insert({
      ...productData,
      is_active: productData.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
  return data as ProductType;
}

export async function updateAdminProductAction(
  productId: string,
  productData: UpdateProductData,
): Promise<ProductType> {
  await requireAdmin();
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("products")
    .update({
      ...productData,
      updated_at: new Date().toISOString(),
    })
    .eq("product_id", productId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
  revalidatePath(`/products/${data.slug || productId}`);
  return data as ProductType;
}

export async function syncAdminProductVariantsAction(
  productId: string,
  variants: AdminVariantInput[],
): Promise<ProductVariantType[]> {
  await requireAdmin();
  const supabase = await createServerSupabase();

  const normalizedVariants = variants.map((variant) => {
    const parsed = productVariantSchema.parse({
      product_id: productId,
      size: variant.size,
      color: variant.color,
      sku: variant.sku || undefined,
      stock: variant.stock,
      price_override: variant.price_override ?? null,
      image_url: variant.image_url || null,
      is_active: variant.is_active,
    });

    return {
      ...parsed,
      id: variant.id,
      updated_at: new Date().toISOString(),
    };
  });

  const duplicateKeys = new Set<string>();
  for (const variant of normalizedVariants) {
    const key = `${variant.size.trim().toLowerCase()}::${variant.color.trim().toLowerCase()}`;
    if (duplicateKeys.has(key)) {
      throw new Error(`Duplicate variant: ${variant.size} / ${variant.color}`);
    }
    duplicateKeys.add(key);
  }

  const { data: existingVariants, error: fetchError } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId);

  if (fetchError) {
    if (isMissingVariantTableError(fetchError)) {
      revalidatePath("/admin/products");
      revalidatePath("/products");
      return [];
    }
    throw new Error(fetchError.message);
  }

  const incomingIds = normalizedVariants
    .map((variant) => variant.id)
    .filter((id): id is string => Boolean(id));
  const idsToDeactivate = (existingVariants || [])
    .map((variant) => variant.id as string)
    .filter((id) => !incomingIds.includes(id));

  if (idsToDeactivate.length > 0) {
    const { error: deactivateError } = await supabase
      .from("product_variants")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in("id", idsToDeactivate);

    if (deactivateError) {
      if (isMissingVariantTableError(deactivateError)) {
        revalidatePath("/admin/products");
        revalidatePath("/products");
        return [];
      }
      throw new Error(deactivateError.message);
    }
  }

  if (normalizedVariants.length === 0) {
    revalidatePath("/admin/products");
    revalidatePath("/products");
    return [];
  }

  const { data, error } = await supabase
    .from("product_variants")
    .upsert(normalizedVariants, { onConflict: "product_id,size,color" })
    .select();

  if (error) {
    if (isMissingVariantTableError(error)) {
      revalidatePath("/admin/products");
      revalidatePath("/products");
      return [];
    }
    throw new Error(error.message);
  }

  const synced = (data || []) as ProductVariantType[];
  const activeVariants = synced.filter((variant) => variant.is_active !== false);
  const totalStock = activeVariants.reduce(
    (total, variant) => total + Number(variant.stock || 0),
    0,
  );
  const sizes = Array.from(
    new Set(activeVariants.map((variant) => variant.size.trim()).filter(Boolean)),
  );
  const colors = Array.from(
    new Set(activeVariants.map((variant) => variant.color.trim()).filter(Boolean)),
  );

  await supabase
    .from("products")
    .update({
      stock: totalStock,
      sizes,
      colors,
      updated_at: new Date().toISOString(),
    })
    .eq("product_id", productId);

  const { data: productForPath } = await supabase
    .from("products")
    .select("slug")
    .eq("product_id", productId)
    .maybeSingle();

  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
  revalidatePath(`/products/${productForPath?.slug || productId}`);
  return synced;
}

export async function deactivateAdminProductAction(
  productId: string,
): Promise<boolean> {
  await requireAdmin();
  const supabase = await createServerSupabase();

  const { error } = await supabase
    .from("products")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("product_id", productId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
  return true;
}

export type DeleteProductResult =
  | { status: "deleted" }
  | { status: "hidden"; reason: string };

export async function deleteAdminProductAction(
  productId: string,
): Promise<DeleteProductResult> {
  await requireAdmin();
  const supabase = await createServerSupabase();

  // Refuse to hard-delete a product that is already linked to historical
  // order data. Cancelling/hiding the product is safer than breaking past
  // orders.
  const { count: orderItemCount, error: orderItemError } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  if (orderItemError) {
    throw new Error(orderItemError.message);
  }

  if ((orderItemCount ?? 0) > 0) {
    const { error: hideError } = await supabase
      .from("products")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("product_id", productId);

    if (hideError) {
      throw new Error(hideError.message);
    }

    revalidatePath("/admin/products");
    revalidatePath("/products");
    revalidatePath("/");
    return {
      status: "hidden",
      reason:
        "Không thể xóa sản phẩm vì sản phẩm đã có trong đơn hàng. Hệ thống đã chuyển sang trạng thái ẩn để giữ lại lịch sử đơn hàng.",
    };
  }

  // No FK conflict — try a hard delete. cart_items / product_variants /
  // product_images cascade on delete; reviews cascade on delete.
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("product_id", productId);

  if (error) {
    // Last-ditch safety net: if a constraint we did not detect blocks
    // the delete, fall back to hiding the product.
    const { error: hideError } = await supabase
      .from("products")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("product_id", productId);

    if (hideError) {
      throw new Error(error.message);
    }

    revalidatePath("/admin/products");
    revalidatePath("/products");
    revalidatePath("/");
    return {
      status: "hidden",
      reason:
        "Không thể xóa sản phẩm vì sản phẩm còn dữ liệu liên quan. Hệ thống đã chuyển sang trạng thái ẩn.",
    };
  }

  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
  return { status: "deleted" };
}
