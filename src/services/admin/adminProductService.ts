import { supabase } from "@/lib/supabase/client";
import { ProductImageType, ProductType, ProductVariantType } from "@/types";
import { withTimeout } from "@/utils/withTimeout";

const ADMIN_QUERY_TIMEOUT_MS = 12000;
const SIDE_QUERY_TIMEOUT_MS = 6000;

export interface CreateProductData {
  title: string;
  slug?: string;
  description: string;
  material?: string;
  price: number;
  sale_price?: number | null;
  image?: string;
  stock: number;
  sizes?: string[];
  colors?: string[];
  is_active?: boolean;
  sku?: string;
  category_id?: number;
}

export interface UpdateProductData extends Partial<CreateProductData> {
  updated_at?: string;
}

export interface ProductWithDetails extends ProductType {
  category?: {
    id: number;
    name: string;
  };
  images?: ProductImageType[];
  variants?: ProductVariantType[];
  total_reviews?: number;
  average_rating?: number;
}

interface GetAllProductsOptions {
  includeReviews?: boolean;
  limit?: number;
}

/**
 * Admin service for product reads. Mutations are routed through server actions
 * so admin permissions are enforced server-side.
 */
export const adminProductService = {
  /**
   * Get all products with additional details for admin view.
   * Variant/image reads are best-effort so older databases still load until the
   * inventory migration is applied.
   */
  async getAllProducts(options: GetAllProductsOptions = {}): Promise<ProductWithDetails[]> {
    const { includeReviews = true, limit } = options;
    const startedAt =
      typeof performance !== "undefined" ? performance.now() : Date.now();

    const MAX_ADMIN_PRODUCTS = 100;
    const effectiveLimit = limit && limit > 0 ? limit : MAX_ADMIN_PRODUCTS;

    // Fail fast if browser session is missing/expired — avoids 12s timeout
    // when auth refresh is stuck behind the processLock mutex.
    const { data: sessionResult, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      throw new Error(`Phiên đăng nhập bị lỗi: ${sessionError.message}`);
    }
    if (!sessionResult.session) {
      throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.");
    }

    // description is heavy text and not displayed in the admin list.
    // sizes/colors arrays are derived from variants in the table view.
    const baseQuery = supabase
      .from("products")
      .select(
        `
        product_id,
        title,
        slug,
        price,
        sale_price,
        image,
        stock,
        sizes,
        colors,
        is_active,
        sku,
        category_id,
        created_at,
        updated_at
        `,
      )
      .order("created_at", { ascending: false })
      .limit(effectiveLimit);

    let baseData: unknown[] = [];
    try {
      const { data, error } = await withTimeout(
        baseQuery,
        ADMIN_QUERY_TIMEOUT_MS,
        "Tải danh sách sản phẩm quá lâu. Vui lòng thử lại.",
      );

      if (error) {
        // sale_price column missing → retry without it
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("sale_price") || (error as { code?: string }).code === "42703") {
          console.warn(
            "[adminProductService.getAllProducts] sale_price column missing; retrying without it",
          );
          const retryQuery = supabase
            .from("products")
            .select(
              `
              product_id,
              title,
              slug,
              price,
              image,
              stock,
              sizes,
              colors,
              is_active,
              sku,
              category_id,
              created_at,
              updated_at
              `,
            )
            .order("created_at", { ascending: false })
            .limit(effectiveLimit);
          const retry = await withTimeout(
            retryQuery,
            ADMIN_QUERY_TIMEOUT_MS,
            "Tải danh sách sản phẩm quá lâu. Vui lòng thử lại.",
          );
          if (retry.error) {
            console.error("[adminProductService.getAllProducts] base products retry failed", {
              message: retry.error.message,
              code: (retry.error as { code?: string }).code,
              table: "products",
            });
            throw retry.error;
          }
          baseData = retry.data || [];
        } else {
          console.error("[adminProductService.getAllProducts] base products query failed", {
            message: error.message,
            code: (error as { code?: string }).code,
            table: "products",
          });
          throw error;
        }
      } else {
        baseData = data || [];
      }
    } catch (err) {
      const elapsedMs = Math.round(
        (typeof performance !== "undefined" ? performance.now() : Date.now()) -
          startedAt,
      );
      const message = err instanceof Error ? err.message : String(err);
      console.error("[adminProductService.getAllProducts] failed", {
        durationMs: elapsedMs,
        message,
        hint:
          elapsedMs >= ADMIN_QUERY_TIMEOUT_MS - 1000
            ? "Timeout reached — likely auth session refresh stuck or network blocked. Try sign out + sign in."
            : undefined,
      });
      throw new Error(`${message} (after ${elapsedMs}ms)`);
    }

    const baseDurationMs = Math.round(
      (typeof performance !== "undefined" ? performance.now() : Date.now()) -
        startedAt,
    );
    console.info("[adminProductService.getAllProducts] base products loaded", {
      count: baseData.length,
      durationMs: baseDurationMs,
    });

    const products = baseData as Array<ProductType & { category_id?: number | null }>;
    if (products.length === 0) return [];

    const productIds = products.map((product) => product.product_id);
    const categoryIds = Array.from(
      new Set(
        products
          .map((product) => product.category_id)
          .filter((id): id is number => Number.isFinite(Number(id))),
      ),
    );

    const [categoriesResult, imagesResult, variantsResult, reviewsResult] =
      await Promise.allSettled([
        this.getCategoriesByIds(categoryIds),
        this.getImagesByProduct(productIds),
        this.getVariantsByProduct(productIds),
        includeReviews
          ? this.getReviewStatsByProduct(productIds)
          : Promise.resolve({} as Record<string, { total: number; average: number }>),
      ]);

    const categoriesMap =
      categoriesResult.status === "fulfilled" ? categoriesResult.value : {};
    if (categoriesResult.status === "rejected") {
      console.warn(
        "[adminProductService.getAllProducts] categories side query failed (category=undefined)",
        categoriesResult.reason,
      );
    }

    const imagesMap =
      imagesResult.status === "fulfilled" ? imagesResult.value : {};
    if (imagesResult.status === "rejected") {
      console.warn(
        "[adminProductService.getAllProducts] product_images side query failed (fallback to products.image)",
        imagesResult.reason,
      );
    }
    const variantsMap =
      variantsResult.status === "fulfilled" ? variantsResult.value : {};
    if (variantsResult.status === "rejected") {
      console.warn(
        "[adminProductService.getAllProducts] product_variants side query failed (variants=[])",
        variantsResult.reason,
      );
    }
    const reviewsMap =
      reviewsResult.status === "fulfilled" ? reviewsResult.value : {};
    if (reviewsResult.status === "rejected") {
      console.warn(
        "[adminProductService.getAllProducts] reviews side query failed",
        reviewsResult.reason,
      );
    }

    return products.map((product) => {
      const reviewStats = reviewsMap[product.product_id as string];
      const categoryId = product.category_id;
      const category =
        categoryId != null ? categoriesMap[String(categoryId)] : undefined;
      const row: ProductWithDetails = {
        ...(product as ProductType),
        category: category ?? undefined,
        images: imagesMap[product.product_id as string] ?? [],
        variants: variantsMap[product.product_id as string] ?? [],
        total_reviews: reviewStats?.total ?? 0,
        average_rating: reviewStats?.average ?? 0,
      };
      return row;
    });
  },

  async getCategoriesByIds(
    categoryIds: number[],
  ): Promise<Record<string, { id: number; name: string }>> {
    if (categoryIds.length === 0) return {};

    const categoriesQuery = supabase
      .from("categories")
      .select("id, name")
      .in("id", categoryIds);

    const { data, error } = await withTimeout(
      categoriesQuery,
      SIDE_QUERY_TIMEOUT_MS,
      "Tải danh mục sản phẩm quá lâu.",
    );

    if (error) {
      console.warn(
        "[adminProductService.getCategoriesByIds] categories unavailable:",
        { message: error.message, code: (error as { code?: string }).code },
      );
      return {};
    }

    return (data || []).reduce<Record<string, { id: number; name: string }>>(
      (acc, category) => {
        acc[String(category.id)] = { id: category.id, name: category.name };
        return acc;
      },
      {},
    );
  },

  async getVariantsByProduct(
    productIds: string[],
  ): Promise<Record<string, ProductVariantType[]>> {
    if (productIds.length === 0) return {};

    const variantsQuery = supabase
      .from("product_variants")
      .select("*")
      .in("product_id", productIds)
      .order("size", { ascending: true });

    const { data, error } = await withTimeout(
      variantsQuery,
      SIDE_QUERY_TIMEOUT_MS,
      "Tải phân loại sản phẩm quá lâu.",
    );

    if (error) {
      console.warn(
        "[adminProductService.getVariantsByProduct] product_variants unavailable:",
        { message: error.message, code: (error as { code?: string }).code },
      );
      return {};
    }

    return (data || []).reduce<Record<string, ProductVariantType[]>>(
      (acc, variant) => {
        acc[variant.product_id] = acc[variant.product_id] || [];
        acc[variant.product_id].push(variant);
        return acc;
      },
      {},
    );
  },

  async getReviewStatsByProduct(
    productIds: string[],
  ): Promise<Record<string, { total: number; average: number }>> {
    if (productIds.length === 0) return {};

    const reviewsQuery = supabase
      .from("reviews")
      .select("product_id, rating")
      .in("product_id", productIds);

    const { data, error } = await withTimeout(
      reviewsQuery,
      SIDE_QUERY_TIMEOUT_MS,
      "Tải đánh giá sản phẩm quá lâu.",
    );

    if (error) {
      console.warn(
        "[adminProductService.getReviewStatsByProduct] reviews unavailable:",
        { message: error.message, code: (error as { code?: string }).code },
      );
      return {};
    }

    const accumulator: Record<string, { total: number; sum: number }> = {};
    for (const review of data || []) {
      const existing = accumulator[review.product_id] || { total: 0, sum: 0 };
      existing.total += 1;
      existing.sum += review.rating;
      accumulator[review.product_id] = existing;
    }

    return Object.fromEntries(
      Object.entries(accumulator).map(([productId, value]) => [
        productId,
        {
          total: value.total,
          average: Number((value.sum / value.total).toFixed(1)),
        },
      ]),
    );
  },

  async getImagesByProduct(
    productIds: string[],
  ): Promise<Record<string, ProductImageType[]>> {
    if (productIds.length === 0) return {};

    const imagesQuery = supabase
      .from("product_images")
      .select("*")
      .in("product_id", productIds)
      .order("sort_order", { ascending: true });

    const { data, error } = await withTimeout(
      imagesQuery,
      SIDE_QUERY_TIMEOUT_MS,
      "Tải ảnh sản phẩm quá lâu.",
    );

    if (error) {
      console.warn(
        "[adminProductService.getImagesByProduct] product_images unavailable (fallback to products.image):",
        { message: error.message, code: (error as { code?: string }).code },
      );
      return {};
    }

    return (data || []).reduce<Record<string, ProductImageType[]>>(
      (acc, image) => {
        acc[image.product_id] = acc[image.product_id] || [];
        acc[image.product_id].push(image);
        return acc;
      },
      {},
    );
  },

  /**
   * @deprecated Use createAdminProductAction server action instead.
   * Browser-side writes are blocked by RLS on production.
   */
  async createProduct(_productData: CreateProductData): Promise<ProductType> {
    throw new Error("Use createAdminProductAction server action instead.");
  },

  /**
   * @deprecated Use updateAdminProductAction server action instead.
   * Browser-side writes are blocked by RLS on production.
   */
  async updateProduct(
    _productId: string,
    _productData: UpdateProductData,
  ): Promise<ProductType> {
    throw new Error("Use updateAdminProductAction server action instead.");
  },

  /**
   * @deprecated Use deleteAdminProductAction server action instead.
   * Browser-side writes are blocked by RLS on production.
   */
  async deleteProduct(_productId: string): Promise<boolean> {
    throw new Error("Use deleteAdminProductAction server action instead.");
  },

  async updateStock(productId: string, newStock: number): Promise<ProductType> {
    try {
      const { data, error } = await supabase
        .from("products")
        .update({
          stock: newStock,
          updated_at: new Date().toISOString(),
        })
        .eq("product_id", productId)
        .select()
        .single();

      if (error) {
        console.error("Error updating product stock:", error);
        throw error;
      }

      return data;
    } catch (err) {
      console.error("Failed to update product stock:", err);
      throw err;
    }
  },

  async getLowStockProducts(threshold: number = 10): Promise<ProductType[]> {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .lt("stock", threshold)
        .order("stock", { ascending: true });

      if (error) {
        console.error("Error fetching low stock products:", error);
        throw error;
      }

      return data || [];
    } catch (err) {
      console.error("Failed to get low stock products:", err);
      return [];
    }
  },

  async getProductAnalytics() {
    try {
      const { count: totalProducts } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });

      const { data: categoryCounts } = await supabase.from("products").select(`
        category_id,
        categories!products_category_id_fkey (
          name
        )
      `);

      const categoryStats = (categoryCounts || []).reduce<
        Record<string, number>
      >((acc, product) => {
        const categoryName = (() => {
          const cat = (product as { categories?: unknown }).categories;
          if (Array.isArray(cat)) {
            return (cat[0] as { name?: string }).name ?? "Uncategorized";
          }
          return (cat as { name?: string } | null)?.name ?? "Uncategorized";
        })();

        acc[categoryName] = (acc[categoryName] || 0) + 1;
        return acc;
      }, {});

      const { count: lowStockCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .lt("stock", 10);

      const { data: products } = await supabase
        .from("products")
        .select("price, stock");

      const totalInventoryValue = (products || []).reduce(
        (sum, product) => sum + product.price * product.stock,
        0,
      );

      return {
        totalProducts: totalProducts || 0,
        categoryStats,
        lowStockCount: lowStockCount || 0,
        totalInventoryValue: Number(totalInventoryValue.toFixed(2)),
      };
    } catch (err) {
      console.error("Failed to get product analytics:", err);
      return {
        totalProducts: 0,
        categoryStats: {},
        lowStockCount: 0,
        totalInventoryValue: 0,
      };
    }
  },

  async bulkUpdateProducts(
    updates: Array<{ productId: string; data: UpdateProductData }>,
  ): Promise<boolean> {
    try {
      const promises = updates.map(({ productId, data }) =>
        this.updateProduct(productId, data),
      );

      await Promise.all(promises);
      return true;
    } catch (err) {
      console.error("Failed to bulk update products:", err);
      throw err;
    }
  },
};
