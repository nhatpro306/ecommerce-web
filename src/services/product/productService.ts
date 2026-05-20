import { supabase } from '@/lib/supabase/client';
import { ProductType } from '../../types';
import { isNoRowsError, toUserFacingQueryError } from '@/utils/errorHandling';
import { findSampleProduct, sampleProducts } from '@/utils/sampleProducts';

export const productService = {
  async getProducts(): Promise<ProductType[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('is_active', true)
        .order('title');

      if (error) {
        throw toUserFacingQueryError('Products', error);
      }

      const products = (data || []) as ProductType[];
      return products.length > 0 ? products : sampleProducts;
    } catch (error) {
      console.warn('Using sample products because Supabase products are unavailable:', error);
      return sampleProducts;
    }
  },

  async getProductById(id: string): Promise<ProductType | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('product_id', id)
        .eq('is_active', true)
        .single();

      if (error) {
        if (isNoRowsError(error)) {
          return null;
        }
        throw toUserFacingQueryError('Product', error);
      }

      return (data as ProductType) || findSampleProduct(id);
    } catch (error) {
      const fallbackProduct = findSampleProduct(id);
      if (fallbackProduct) return fallbackProduct;
      throw error instanceof Error ? error : toUserFacingQueryError('Product', {});
    }
  },

  async getProductsByCategory(categoryId: number): Promise<ProductType[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(*)')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .order('title');

      if (error) {
        throw toUserFacingQueryError('Products', error);
      }

      const products = (data || []) as ProductType[];
      const fallbackProducts = sampleProducts.filter(
        (product) => product.category_id === categoryId
      );
      return products.length > 0 ? products : fallbackProducts;
    } catch (error) {
      console.warn(
        'Using sample category products because Supabase products are unavailable:',
        error
      );
      return sampleProducts.filter((product) => product.category_id === categoryId);
    }
  },
};
