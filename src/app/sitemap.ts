import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { ProductType } from "@/types";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let products: ProductType[] = [];

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const { data } = await supabase
      .from("products")
      .select("product_id, slug, created_at, updated_at")
      .eq("is_active", true);

    products = (data || []) as ProductType[];
  }

  const staticRoutes = ["", "/products", "/cart", "/checkout"].map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
  }));

  const productRoutes = products.map((product) => ({
    url: `${siteUrl}/products/${product.slug || product.product_id}`,
    lastModified: product.updated_at
      ? new Date(product.updated_at)
      : product.created_at
        ? new Date(product.created_at)
        : new Date(),
  }));

  return [...staticRoutes, ...productRoutes];
}
