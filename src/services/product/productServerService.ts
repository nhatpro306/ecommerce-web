import { createServerSupabase } from '@/lib/supabase/server';
import { ProductType } from '@/types';

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
        return [];
      }

      return data as ProductType[];
    } catch (error) {
      console.error('Error in getProducts:', error);
      return [];
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
        return null;
      }

      return data as ProductType;
    } catch (error) {
      console.error('Error in getProductById:', error);
      return null;
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
        return null;
      }

      return data as ProductType;
    } catch (error) {
      console.error('Error in getProductBySlug:', error);
      return null;
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
        return [];
      }

      return data as ProductType[];
    } catch (error) {
      console.error('Error in getProductsByCategory:', error);
      return [];
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
        return [];
      }

      return data as ProductType[];
    } catch (error) {
      console.error('Error in searchProducts:', error);
      return [];
    }
  },
};
