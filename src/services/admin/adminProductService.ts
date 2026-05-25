import { supabase } from "@/lib/supabase/client";
import { ProductImageType, ProductType, ProductVariantType } from "@/types";

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

const PRODUCT_ADMIN_SELECT = `
  product_id,
  slug,
  title,
  description,
  material,
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
  updated_at,
  categories!products_category_id_fkey (
    id,
    name
  ),
  product_images (
    id,
    product_id,
    url,
    alt_text,
    sort_order,
    is_primary,
    created_at
  ),
  product_variants (
    id,
    product_id,
    size,
    color,
    sku,
    stock,
    price_override,
    image_url,
    is_active,
    created_at,
    updated_at
  )
`;

const PRODUCT_VARIANT_SELECT = `
  id,
  product_id,
  size,
  color,
  sku,
  stock,
  price_override,
  image_url,
  is_active,
  created_at,
  updated_at
`;

const PRODUCT_IMAGE_SELECT = `
  id,
  product_id,
  url,
  alt_text,
  sort_order,
  is_primary,
  created_at
`;

function normalizeProductCategory(
  category:
    | { id?: number | null; name?: string | null }
    | { id?: number | null; name?: string | null }[]
    | null
    | undefined,
) {
  const value = Array.isArray(category) ? category[0] : category;
  if (!value?.id || !value.name) return undefined;
  return {
    id: value.id,
    name: value.name,
  };
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
    try {
      const { includeReviews = true, limit } = options;

      let query = supabase
        .from("products")
        .select(PRODUCT_ADMIN_SELECT)
        .order("created_at", { ascending: false });
      if (limit && limit > 0) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching all products:", error);
        throw error;
      }

      const products = data || [];
      const productIds = products.map((product) => product.product_id);

      const reviewsByProduct = includeReviews
        ? await this.getReviewStatsByProduct(productIds)
        : {};

      return products.map((product) => {
        const reviewStats = reviewsByProduct[product.product_id];
        return {
          ...product,
          category: normalizeProductCategory(product.categories),
          images: product.product_images || [],
          variants: product.product_variants || [],
          total_reviews: reviewStats?.total ?? 0,
          average_rating: reviewStats?.average ?? 0,
        };
      });
    } catch (err) {
      console.error("Failed to get all products:", err);
      throw err;
    }
  },

  async getVariantsByProduct(
    productIds: string[],
  ): Promise<Record<string, ProductVariantType[]>> {
    if (productIds.length === 0) return {};

    const { data, error } = await supabase
      .from("product_variants")
      .select(PRODUCT_VARIANT_SELECT)
      .in("product_id", productIds)
      .order("size", { ascending: true });

    if (error) {
      console.warn("Product variants are not available yet:", error.message);
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

    const { data, error } = await supabase
      .from("reviews")
      .select("product_id, rating")
      .in("product_id", productIds);

    if (error) {
      console.warn("Product reviews are not available:", error.message);
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

    const { data, error } = await supabase
      .from("product_images")
      .select(PRODUCT_IMAGE_SELECT)
      .in("product_id", productIds)
      .order("sort_order", { ascending: true });

    if (error) {
      console.warn("Product images are not available yet:", error.message);
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
   * Create a new product. Kept for compatibility; admin pages should use server
   * actions for writes.
   */
  async createProduct(productData: CreateProductData): Promise<ProductType> {
    try {
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
        console.error("Error creating product:", error);
        throw error;
      }

      return data;
    } catch (err) {
      console.error("Failed to create product:", err);
      throw err;
    }
  },

  async updateProduct(
    productId: string,
    productData: UpdateProductData,
  ): Promise<ProductType> {
    try {
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
        console.error("Error updating product:", error);
        throw error;
      }

      return data;
    } catch (err) {
      console.error("Failed to update product:", err);
      throw err;
    }
  },

  async deleteProduct(productId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("product_id", productId);

      if (error) {
        console.error("Error deleting product:", error);
        throw error;
      }

      return true;
    } catch (err) {
      console.error("Failed to delete product:", err);
      throw err;
    }
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
        .select("product_id, slug, title, description, material, price, sale_price, image, stock, sizes, colors, is_active, sku, category_id, created_at, updated_at")
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
        .select("product_id", { count: "exact", head: true });

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
        .select("product_id", { count: "exact", head: true })
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
