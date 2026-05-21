import { supabase } from '@/lib/supabase/client';
import { ProductType } from '../../types';
import { isNoRowsError, toUserFacingQueryError } from '@/utils/errorHandling';
import {
  findSampleProduct,
  mergeWithSampleProducts,
  sampleProducts,
} from '@/utils/sampleProducts';
import { useDemoData } from '@/utils/demoData';
import { withTimeout } from '@/utils/withTimeout';

const PRODUCT_QUERY_TIMEOUT_MS = 8000;

export const productService = {
  async getProducts(): Promise<ProductType[]> {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('products')
          .select('*, category:categories(*)')
          .eq('is_active', true)
          .order('title'),
        PRODUCT_QUERY_TIMEOUT_MS,
        'Không thể tải sản phẩm. Kết nối Supabase phản hồi quá lâu.',
      );

      if (error) {
        throw toUserFacingQueryError('Products', error);
      }

      const products = (data || []) as ProductType[];
      if (useDemoData) {
        return products.length > 0 ? mergeWithSampleProducts(products) : sampleProducts;
      }
      return products;
    } catch (error) {
      if (useDemoData) {
        console.warn('Using demo products because Supabase products are unavailable:', error);
        return sampleProducts;
      }
      throw error;
    }
  },

  async getProductById(id: string): Promise<ProductType | null> {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('products')
          .select('*, category:categories(*)')
          .eq('product_id', id)
          .eq('is_active', true)
          .single(),
        PRODUCT_QUERY_TIMEOUT_MS,
        'Không thể tải chi tiết sản phẩm. Kết nối Supabase phản hồi quá lâu.',
      );

      if (error) {
        if (isNoRowsError(error)) {
          return null;
        }
        throw toUserFacingQueryError('Product', error);
      }

      return (data as ProductType) || (useDemoData ? findSampleProduct(id) : null);
    } catch (error) {
      const fallbackProduct = useDemoData ? findSampleProduct(id) : null;
      if (fallbackProduct) return fallbackProduct;
      throw error instanceof Error ? error : toUserFacingQueryError('Product', {});
    }
  },

  async getProductsByCategory(categoryId: number): Promise<ProductType[]> {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('products')
          .select('*, category:categories(*)')
          .eq('category_id', categoryId)
          .eq('is_active', true)
          .order('title'),
        PRODUCT_QUERY_TIMEOUT_MS,
        'Không thể tải sản phẩm theo danh mục. Kết nối Supabase phản hồi quá lâu.',
      );

      if (error) {
        throw toUserFacingQueryError('Products', error);
      }

      const products = useDemoData
        ? mergeWithSampleProducts((data || []) as ProductType[])
        : ((data || []) as ProductType[]);
      const fallbackProducts = products.filter(
        (product) => product.category_id === categoryId
      );
      return fallbackProducts;
    } catch (error) {
      if (useDemoData) {
        console.warn(
          'Using demo category products because Supabase products are unavailable:',
          error
        );
        return sampleProducts.filter((product) => product.category_id === categoryId);
      }
      throw error;
    }
  },
};
