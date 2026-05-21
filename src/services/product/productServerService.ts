import { createServerSupabase } from '@/lib/supabase/server';
import { ProductType } from '@/types';
import {
  findSampleProduct,
  mergeWithSampleProducts,
  sampleProducts,
} from '@/utils/sampleProducts';
import { useDemoData } from '@/utils/demoData';

export const productServerService = {
  async getProducts(): Promise<ProductType[]> {
    try {
      const supabase = await createServerSupabase();
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('is_active', true)
        .order('title');

      if (error) {
        console.error('Error fetching products:', error);
        return useDemoData ? sampleProducts : [];
      }

      const products = (data || []) as ProductType[];
      if (useDemoData) {
        return products.length > 0 ? mergeWithSampleProducts(products) : sampleProducts;
      }
      return products;
    } catch (error) {
      console.error('Error in getProducts:', error);
      return useDemoData ? sampleProducts : [];
    }
  },

  async getProductById(id: string): Promise<ProductType | null> {
    try {
      const supabase = await createServerSupabase();
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('product_id', id)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        return useDemoData ? findSampleProduct(id) : null;
      }

      return (data as ProductType) || (useDemoData ? findSampleProduct(id) : null);
    } catch (error) {
      console.error('Error in getProductById:', error);
      return useDemoData ? findSampleProduct(id) : null;
    }
  },

async getProductBySlug(slug: string): Promise<ProductType | null> {
  try {
    const supabase = await createServerSupabase();

    // 1. Search by slug first
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching product by slug:', error);
      return useDemoData ? findSampleProduct(slug) : null;
    }

    if (data) {
      return data as ProductType;
    }

    // 2. Fallback: if URL param is numeric, search by product_id
    const numericId = Number(slug);

    if (!Number.isNaN(numericId)) {
      const { data: productById, error: idError } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('product_id', numericId)
        .eq('is_active', true)
        .maybeSingle();

      if (idError) {
        console.error('Error fetching product by numeric id:', idError);
        return useDemoData ? findSampleProduct(slug) : null;
      }

      return (productById as ProductType) || (useDemoData ? findSampleProduct(slug) : null);
    }

    return useDemoData ? findSampleProduct(slug) : null;
  } catch (error) {
    console.error('Error in getProductBySlug:', error);
    return useDemoData ? findSampleProduct(slug) : null;
  }
} 

  ,

  async getProductsByCategory(categoryId: number): Promise<ProductType[]> {
    try {
      const supabase = await createServerSupabase();
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .order('title');

      if (error) {
        console.error('Error fetching products by category:', error);
        return useDemoData
          ? sampleProducts.filter((product) => product.category_id === categoryId)
          : [];
      }

      const products = (data || []) as ProductType[];
      const mergedProducts = useDemoData ? mergeWithSampleProducts(products) : products;
      return mergedProducts.filter((product) => product.category_id === categoryId);
    } catch (error) {
      console.error('Error in getProductsByCategory:', error);
      return useDemoData
        ? sampleProducts.filter((product) => product.category_id === categoryId)
        : [];
    }
  },

  async searchProducts(query: string): Promise<ProductType[]> {
    try {
      const supabase = await createServerSupabase();
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('is_active', true)
        .ilike('title', `%${query}%`)
        .order('title');

      if (error) {
        console.error('Error searching products:', error);
        return useDemoData
          ? sampleProducts.filter((product) =>
              product.title.toLowerCase().includes(query.toLowerCase())
            )
          : [];
      }

      const products = useDemoData
        ? mergeWithSampleProducts((data || []) as ProductType[])
        : ((data || []) as ProductType[]);
      const fallbackProducts = sampleProducts.filter((product) =>
        product.title.toLowerCase().includes(query.toLowerCase())
      );
      return products.length > 0
        ? products.filter((product) =>
            product.title.toLowerCase().includes(query.toLowerCase())
          )
        : fallbackProducts;
    } catch (error) {
      console.error('Error in searchProducts:', error);
      return useDemoData
        ? sampleProducts.filter((product) =>
            product.title.toLowerCase().includes(query.toLowerCase())
          )
        : [];
    }
  },
};

