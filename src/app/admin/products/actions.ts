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

  const totalStock = (data || []).reduce(
    (total, variant) => total + Number(variant.stock || 0),
    0,
  );

  await supabase
    .from("products")
    .update({ stock: totalStock, updated_at: new Date().toISOString() })
    .eq("product_id", productId);

  revalidatePath("/admin/products");
  revalidatePath("/products");
  return data as ProductVariantType[];
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
