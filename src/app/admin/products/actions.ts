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

export interface AdminProductImageInput {
  url: string;
  alt_text?: string | null;
  sort_order: number;
  is_primary: boolean;
}

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function logSupabaseError(
  operation: string,
  error: SupabaseLikeError,
  context?: Record<string, unknown>,
) {
  console.error("[admin/products]", {
    operation,
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
    ...context,
  });
}

function getSupabaseErrorMessage(
  operation: string,
  error: SupabaseLikeError,
  context?: string,
) {
  return [
    operation,
    context,
    error.code ? `code ${error.code}` : null,
    error.message,
    error.details,
    error.hint,
  ]
    .filter(Boolean)
    .join(" - ");
}

function isMissingVariantTableError(error: { code?: string; message?: string }) {
  const message = `${error.code || ""} ${error.message || ""}`.toLowerCase();

  return (
    message.includes("product_variants") &&
    (message.includes("schema cache") ||
      message.includes("does not exist") ||
      message.includes("relation") ||
      message.includes("pgrst200") ||
      message.includes("42p01"))
  );
}

function schemaFixMessage(subject: string) {
  return `Thiếu schema Supabase cho ${subject}. Vui lòng chạy migration mới nhất rồi thử lại.`;
}

function isMissingSalePriceColumnError(error: {
  code?: string;
  message?: string;
}) {
  const message = `${error.code || ""} ${error.message || ""}`.toLowerCase();

  return (
    message.includes("sale_price") &&
    (message.includes("column") ||
      message.includes("schema cache") ||
      message.includes("does not exist") ||
      message.includes("pgrst"))
  );
}

function revalidateProductPaths(slugOrId?: string) {
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");

  if (slugOrId) {
    revalidatePath(`/products/${slugOrId}`);
  }
}

function looksLikeTestProduct(title?: string | null, description?: string | null) {
  const text = `${title || ""} ${description || ""}`.toLowerCase();
  return /(test|demo|sample|mock|aaa|123)/.test(text);
}

async function getPublishReadiness(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  productId: string,
) {
  const reasons: string[] = [];

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("product_id,title,description,price,stock,category_id,is_active,slug")
    .eq("product_id", productId)
    .maybeSingle();

  if (productError || !product) {
    return {
      ok: false,
      reasons: ["Không thể tải thông tin sản phẩm để kiểm tra đăng bán."],
      slug: null as string | null,
    };
  }

  if (!product.title?.trim()) reasons.push("Vui lòng nhập tên sản phẩm.");
  if (!product.category_id) reasons.push("Vui lòng chọn danh mục.");
  if (!(Number(product.price) > 0)) reasons.push("Vui lòng nhập giá bán hợp lệ.");
  if (looksLikeTestProduct(product.title, product.description)) {
    reasons.push("Không thể đăng bán sản phẩm test/demo.");
  }

  const { data: images, error: imageError } = await supabase
    .from("product_images")
    .select("id,is_primary")
    .eq("product_id", productId);
  if (imageError || !images || images.length === 0) {
    reasons.push("Vui lòng tải ít nhất 1 ảnh sản phẩm.");
  } else if (!images.some((image) => image.is_primary)) {
    reasons.push("Vui lòng chọn ảnh chính cho sản phẩm.");
  }

  const { data: variants, error: variantError } = await supabase
    .from("product_variants")
    .select("stock,is_active")
    .eq("product_id", productId);

  if (variantError && !isMissingVariantTableError(variantError)) {
    reasons.push("Không thể kiểm tra phân loại sản phẩm.");
  }

  const activeVariantStock = (variants || [])
    .filter((variant) => variant.is_active !== false)
    .reduce((sum, variant) => sum + Number(variant.stock || 0), 0);

  const sellableStock = variants && variants.length > 0 ? activeVariantStock : Number(product.stock || 0);
  if (!(sellableStock > 0)) {
    reasons.push("Vui lòng nhập tồn kho hoặc tạo phân loại.");
  }

  return { ok: reasons.length === 0, reasons, slug: product.slug || null };
}

export async function validateProductPublishReadinessAction(productId: string) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  return getPublishReadiness(supabase, productId);
}

export async function createAdminProductAction(
  productData: CreateProductData,
): Promise<ProductType> {
  await requireAdmin();
  const supabase = await createServerSupabase();

  const insertPayload = {
    ...productData,
    is_active: productData.is_active ?? false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("products")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    logSupabaseError("create_product_failed", error, {
      insertPayload,
    });

    if (isMissingSalePriceColumnError(error)) {
      throw new Error(schemaFixMessage("cột products.sale_price"));
    }

    throw new Error(
      getSupabaseErrorMessage("Không thể tạo sản phẩm", error),
    );
  }

  if (insertPayload.is_active) {
    const readiness = await getPublishReadiness(supabase, data.product_id);
    if (!readiness.ok) {
      await supabase
        .from("products")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("product_id", data.product_id);
      throw new Error(readiness.reasons.join(" "));
    }
  }

  revalidateProductPaths(data?.slug || data?.product_id);
  return data as ProductType;
}

export async function updateAdminProductAction(
  productId: string,
  productData: UpdateProductData,
): Promise<ProductType> {
  await requireAdmin();
  const supabase = await createServerSupabase();

  if (!productId?.trim()) {
    throw new Error("Thiếu product_id. Không thể cập nhật sản phẩm.");
  }

  const updatePayload = {
    ...productData,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("products")
    .update(updatePayload)
    .eq("product_id", productId)
    .select()
    .single();

  if (error) {
    logSupabaseError("update_product_failed", error, {
      productId,
      updatePayload,
    });

    if (isMissingSalePriceColumnError(error)) {
      throw new Error(schemaFixMessage("cột products.sale_price"));
    }

    throw new Error(
      getSupabaseErrorMessage(
        "Không thể cập nhật sản phẩm",
        error,
        `product_id=${productId}`,
      ),
    );
  }

  if (updatePayload.is_active === true) {
    const readiness = await getPublishReadiness(supabase, productId);
    if (!readiness.ok) {
      await supabase
        .from("products")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("product_id", productId);
      throw new Error(readiness.reasons.join(" "));
    }
  }

  revalidateProductPaths(data?.slug || productId);
  return data as ProductType;
}

export async function syncAdminProductVariantsAction(
  productId: string,
  variants: AdminVariantInput[],
): Promise<ProductVariantType[]> {
  await requireAdmin();
  const supabase = await createServerSupabase();

  if (!productId?.trim()) {
    throw new Error("Thiếu product_id. Không thể đồng bộ biến thể sản phẩm.");
  }

  const safeVariants = Array.isArray(variants) ? variants : [];

  const normalizedVariants = safeVariants.map((variant) => {
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
      id: variant.id || undefined,
      updated_at: new Date().toISOString(),
    };
  });

  const duplicateKeys = new Set<string>();

  for (const variant of normalizedVariants) {
    const key = `${variant.size.trim().toLowerCase()}::${variant.color
      .trim()
      .toLowerCase()}`;

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
    logSupabaseError("fetch_existing_variants_failed", fetchError, {
      productId,
    });

    if (isMissingVariantTableError(fetchError)) {
      throw new Error(schemaFixMessage("bảng product_variants"));
    }

    throw new Error(
      getSupabaseErrorMessage(
        "Không thể tải biến thể sản phẩm hiện tại",
        fetchError,
        `product_id=${productId}`,
      ),
    );
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
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .in("id", idsToDeactivate);

    if (deactivateError) {
      logSupabaseError("deactivate_old_variants_failed", deactivateError, {
        productId,
        idsToDeactivate,
      });

      if (isMissingVariantTableError(deactivateError)) {
        throw new Error(schemaFixMessage("bảng product_variants"));
      }

      throw new Error(
        getSupabaseErrorMessage(
          "Không thể ẩn biến thể sản phẩm cũ",
          deactivateError,
          `product_id=${productId}`,
        ),
      );
    }
  }

  let synced: ProductVariantType[] = [];

  if (normalizedVariants.length > 0) {
    /**
     * Important:
     * Không dùng onConflict: "product_id,size,color" ở đây.
     * Schema hiện tại của bạn chưa có unique constraint cho bộ
     * product_id + size + color, nên upsert theo bộ đó có thể gây lỗi 500.
     *
     * Dùng primary key id:
     * - variant có id  -> update
     * - variant chưa id -> insert mới
     */
    const { data, error } = await supabase
      .from("product_variants")
      .upsert(normalizedVariants, { onConflict: "id" })
      .select();

    if (error) {
      logSupabaseError("upsert_variants_failed", error, {
        productId,
        normalizedVariants,
      });

      if (isMissingVariantTableError(error)) {
        throw new Error(schemaFixMessage("bảng product_variants"));
      }

      throw new Error(
        getSupabaseErrorMessage(
          "Không thể đồng bộ biến thể sản phẩm",
          error,
          `product_id=${productId}`,
        ),
      );
    }

    synced = (data || []) as ProductVariantType[];
  }

  const activeVariants = synced.filter((variant) => variant.is_active !== false);

  const totalStock = activeVariants.reduce(
    (total, variant) => total + Number(variant.stock || 0),
    0,
  );

  const sizes = Array.from(
    new Set(
      activeVariants
        .map((variant) => variant.size.trim())
        .filter(Boolean),
    ),
  );

  const colors = Array.from(
    new Set(
      activeVariants
        .map((variant) => variant.color.trim())
        .filter(Boolean),
    ),
  );

  const { error: productUpdateError } = await supabase
    .from("products")
    .update({
      stock: totalStock,
      sizes,
      colors,
      updated_at: new Date().toISOString(),
    })
    .eq("product_id", productId);

  if (productUpdateError) {
    logSupabaseError("update_product_variant_summary_failed", productUpdateError, {
      productId,
      stock: totalStock,
      sizes,
      colors,
    });

    throw new Error(
      getSupabaseErrorMessage(
        "Đã lưu biến thể nhưng không thể cập nhật tổng tồn kho/sizes/colors cho sản phẩm",
        productUpdateError,
        `product_id=${productId}`,
      ),
    );
  }

  const { data: productForPath, error: productForPathError } = await supabase
    .from("products")
    .select("slug")
    .eq("product_id", productId)
    .maybeSingle();

  if (productForPathError) {
    logSupabaseError("fetch_product_slug_after_variant_sync_failed", productForPathError, {
      productId,
    });
  }

  revalidateProductPaths(productForPath?.slug || productId);
  return synced;
}

export async function deactivateAdminProductAction(
  productId: string,
): Promise<boolean> {
  await requireAdmin();
  const supabase = await createServerSupabase();

  if (!productId?.trim()) {
    throw new Error("Thiếu product_id. Không thể ẩn sản phẩm.");
  }

  const { error } = await supabase
    .from("products")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("product_id", productId);

  if (error) {
    logSupabaseError("deactivate_product_failed", error, {
      productId,
    });

    throw new Error(
      getSupabaseErrorMessage(
        "Không thể ẩn sản phẩm",
        error,
        `product_id=${productId}`,
      ),
    );
  }

  revalidateProductPaths(productId);
  return true;
}

export async function syncAdminProductImagesAction(
  productId: string,
  images: AdminProductImageInput[],
): Promise<boolean> {
  await requireAdmin();
  const supabase = await createServerSupabase();

  if (!productId?.trim()) {
    throw new Error("Thiếu product_id. Không thể lưu ảnh sản phẩm.");
  }

  const normalizedImages = images
    .filter((image) => image.url?.trim())
    .map((image, index) => ({
      product_id: productId,
      url: image.url.trim(),
      alt_text: image.alt_text || null,
      sort_order: image.sort_order ?? index,
      is_primary: image.is_primary,
    }));

  if (normalizedImages.length === 0) {
    throw new Error("Vui lòng tải ít nhất 1 ảnh sản phẩm.");
  }

  if (!normalizedImages.some((image) => image.is_primary)) {
    normalizedImages[0].is_primary = true;
  }

  const { error: deleteError } = await supabase
    .from("product_images")
    .delete()
    .eq("product_id", productId);

  if (deleteError) {
    logSupabaseError("delete_product_images_failed", deleteError, { productId });
    throw new Error(getSupabaseErrorMessage("Không thể cập nhật ảnh sản phẩm", deleteError));
  }

  const { error: insertError } = await supabase
    .from("product_images")
    .insert(normalizedImages);

  if (insertError) {
    logSupabaseError("insert_product_images_failed", insertError, { productId });
    throw new Error(getSupabaseErrorMessage("Không thể lưu ảnh sản phẩm", insertError));
  }

  const primaryImage = normalizedImages.find((image) => image.is_primary) ?? normalizedImages[0];
  const { error: productImageError } = await supabase
    .from("products")
    .update({ image: primaryImage.url, updated_at: new Date().toISOString() })
    .eq("product_id", productId);

  if (productImageError) {
    logSupabaseError("update_product_primary_image_failed", productImageError, { productId });
    throw new Error(getSupabaseErrorMessage("Không thể cập nhật ảnh chính của sản phẩm", productImageError));
  }

  revalidateProductPaths(productId);
  return true;
}

export async function activateAdminProductAction(
  productId: string,
): Promise<boolean> {
  await requireAdmin();
  const supabase = await createServerSupabase();

  if (!productId?.trim()) {
    throw new Error("Thiếu product_id. Không thể bật sản phẩm.");
  }

  const readiness = await getPublishReadiness(supabase, productId);
  if (!readiness.ok) {
    throw new Error(readiness.reasons.join(" "));
  }

  const { error } = await supabase
    .from("products")
    .update({
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("product_id", productId);

  if (error) {
    logSupabaseError("activate_product_failed", error, {
      productId,
    });

    throw new Error(
      getSupabaseErrorMessage(
        "Không thể bật sản phẩm",
        error,
        `product_id=${productId}`,
      ),
    );
  }

  revalidateProductPaths(productId);
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

  if (!productId?.trim()) {
    throw new Error("Thiếu product_id. Không thể xóa sản phẩm.");
  }

  const { count: orderItemCount, error: orderItemError } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  if (orderItemError) {
    logSupabaseError("check_order_items_before_delete_failed", orderItemError, {
      productId,
    });

    throw new Error(
      getSupabaseErrorMessage(
        "Không thể kiểm tra dữ liệu đơn hàng trước khi xóa sản phẩm",
        orderItemError,
        `product_id=${productId}`,
      ),
    );
  }

  if ((orderItemCount ?? 0) > 0) {
    const { error: hideError } = await supabase
      .from("products")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("product_id", productId);

    if (hideError) {
      logSupabaseError("hide_product_with_orders_failed", hideError, {
        productId,
        orderItemCount,
      });

      throw new Error(
        getSupabaseErrorMessage(
          "Không thể ẩn sản phẩm đã có trong đơn hàng",
          hideError,
          `product_id=${productId}`,
        ),
      );
    }

    revalidateProductPaths(productId);

    return {
      status: "hidden",
      reason:
        "Không thể xóa sản phẩm vì sản phẩm đã có trong đơn hàng. Hệ thống đã chuyển sang trạng thái ẩn để giữ lại lịch sử đơn hàng.",
    };
  }

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("product_id", productId);

  if (error) {
    logSupabaseError("hard_delete_product_failed", error, {
      productId,
    });

    const { error: hideError } = await supabase
      .from("products")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("product_id", productId);

    if (hideError) {
      logSupabaseError("fallback_hide_product_after_delete_failed", hideError, {
        productId,
      });

      throw new Error(
        getSupabaseErrorMessage(
          "Không thể xóa hoặc ẩn sản phẩm",
          hideError,
          `product_id=${productId}`,
        ),
      );
    }

    revalidateProductPaths(productId);

    return {
      status: "hidden",
      reason:
        "Không thể xóa sản phẩm vì sản phẩm còn dữ liệu liên quan. Hệ thống đã chuyển sang trạng thái ẩn.",
    };
  }

  revalidateProductPaths(productId);
  return { status: "deleted" };
}
