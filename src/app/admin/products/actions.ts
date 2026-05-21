"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createServerSupabase } from "@/lib/supabase/server";
import type { CreateProductData, UpdateProductData } from "@/services/admin/adminProductService";
import type { ProductType } from "@/types";

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
  revalidatePath(`/products/${data.slug || productId}`);
  return data as ProductType;
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
  return true;
}
