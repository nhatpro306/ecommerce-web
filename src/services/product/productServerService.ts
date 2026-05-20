import { createServerSupabase } from '@/lib/supabase/server';
import { ProductType } from '@/types';
import { findSampleProduct, sampleProducts } from '@/utils/sampleProducts';

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
        return sampleProducts;
      }

      const products = (data || []) as ProductType[];
      return products.length > 0 ? products : sampleProducts;
    } catch (error) {
      console.error('Error in getProducts:', error);
      return sampleProducts;
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
        return findSampleProduct(id);
      }

      return (data as ProductType) || findSampleProduct(id);
    } catch (error) {
      console.error('Error in getProductById:', error);
      return findSampleProduct(id);
    }
  },

  async getProductBySlug(slug: string): Promise<ProductType | null> {
    try {
      const supabase = await createServerSupabase();
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .or(`slug.eq.${slug},product_id.eq.${slug}`)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching product by slug:', error);
        return findSampleProduct(slug);
      }

      return (data as ProductType) || findSampleProduct(slug);
    } catch (error) {
      console.error('Error in getProductBySlug:', error);
      return findSampleProduct(slug);
    }
  },

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
        return sampleProducts.filter((product) => product.category_id === categoryId);
      }

      const products = (data || []) as ProductType[];
      const fallbackProducts = sampleProducts.filter(
        (product) => product.category_id === categoryId
      );
      return products.length > 0 ? products : fallbackProducts;
    } catch (error) {
      console.error('Error in getProductsByCategory:', error);
      return sampleProducts.filter((product) => product.category_id === categoryId);
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
        return sampleProducts.filter((product) =>
          product.title.toLowerCase().includes(query.toLowerCase())
        );
      }

      const products = (data || []) as ProductType[];
      const fallbackProducts = sampleProducts.filter((product) =>
        product.title.toLowerCase().includes(query.toLowerCase())
      );
      return products.length > 0 ? products : fallbackProducts;
    } catch (error) {
      console.error('Error in searchProducts:', error);
      return sampleProducts.filter((product) =>
        product.title.toLowerCase().includes(query.toLowerCase())
      );
    }
  },
};
