import { supabase } from '@/lib/supabase/client';
import { ProductType } from '../../types';
import { toUserFacingQueryError } from '@/utils/errorHandling';
import {
  findSampleProduct,
  mergeWithSampleProducts,
  sampleProducts,
} from '@/utils/sampleProducts';
import { isPubliclyVisibleProduct } from '@/utils/productVisibility';
import { useDemoData } from '@/utils/demoData';
import { withTimeout } from '@/utils/withTimeout';

const PRODUCT_QUERY_TIMEOUT_MS = 8000;
const FULL_PRODUCT_SELECT = '*, category:categories(*), images:product_images(*), variants:product_variants(*)';
const BASIC_PRODUCT_SELECT = '*, category:categories(*)';

function isMissingProductRelation(error: { code?: string; message?: string } | null) {
  const message = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
  return (
    message.includes('pgrst200') ||
    message.includes('product_images') ||
    message.includes('product_variants') ||
    message.includes('schema cache')
  );
}

function productSelect(select = FULL_PRODUCT_SELECT) {
  return supabase.from('products').select(select);
}

function onlyActiveProducts<T extends { or: Function }>(query: T): T {
  return query.or('is_active.eq.true,is_active.is.null') as T;
}

async function runProductQuery<T>(
  buildQuery: (select: string) => PromiseLike<{ data: T; error: { code?: string; message?: string } | null }>,
  timeoutMessage: string,
) {
  const result = await withTimeout(
    buildQuery(FULL_PRODUCT_SELECT),
    PRODUCT_QUERY_TIMEOUT_MS,
    timeoutMessage,
  );

  if (!result.error || !isMissingProductRelation(result.error)) {
    return result;
  }

  return withTimeout(
    buildQuery(BASIC_PRODUCT_SELECT),
    PRODUCT_QUERY_TIMEOUT_MS,
    timeoutMessage,
  );
}


export const productService = {
  async getProducts(): Promise<ProductType[]> {
    try {
      const { data, error } = await runProductQuery(
        (select) => onlyActiveProducts(productSelect(select)).order('title'),
        'Không thềEtải sản phẩm. Kết nối Supabase phản hồi quá lâu.',
      );

      if (error) {
        throw toUserFacingQueryError('Products', error);
      }

      const products = ((data || []) as unknown as ProductType[]).filter(
        isPubliclyVisibleProduct,
      );
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
      const { data, error } = await runProductQuery(
        (select) => onlyActiveProducts(productSelect(select).eq('product_id', id)).single(),
        'Không thềEtải chi tiết sản phẩm. Kết nối Supabase phản hồi quá lâu.',
      );

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw toUserFacingQueryError('Product', error);
      }

      const product = (data as unknown as ProductType) || null;
      if (product && isPubliclyVisibleProduct(product)) return product;
      return useDemoData ? findSampleProduct(id) : null;
    } catch (error) {
      const fallbackProduct = useDemoData ? findSampleProduct(id) : null;
      if (fallbackProduct) return fallbackProduct;
      throw error instanceof Error ? error : toUserFacingQueryError('Product', {});
    }
  },

  async getProductsByCategory(categoryId: number): Promise<ProductType[]> {
    try {
      const { data, error } = await runProductQuery(
        (select) => onlyActiveProducts(productSelect(select).eq('category_id', categoryId)).order('title'),
        'Không thềEtải sản phẩm theo danh mục. Kết nối Supabase phản hồi quá lâu.',
      );

      if (error) {
        throw toUserFacingQueryError('Products', error);
      }

      const products = useDemoData
        ? mergeWithSampleProducts((data || []) as unknown as ProductType[])
        : ((data || []) as unknown as ProductType[]).filter(isPubliclyVisibleProduct);
      return products.filter((product) => product.category_id === categoryId);
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

