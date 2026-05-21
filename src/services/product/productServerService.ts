import { createPublicServerSupabase } from '@/lib/supabase/public-server';
import { ProductType } from '@/types';
import {
  findSampleProduct,
  mergeWithSampleProducts,
  sampleProducts,
} from '@/utils/sampleProducts';
import { useDemoData } from '@/utils/demoData';
import { withServerTimeout } from '@/utils/withTimeout';

const SERVER_PRODUCT_QUERY_TIMEOUT_MS = 8000;
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

function productSelect(supabase: ReturnType<typeof createPublicServerSupabase>, select = FULL_PRODUCT_SELECT) {
  return supabase.from('products').select(select);
}

function onlyVisibleProducts<T extends { or: Function }>(query: T): T {
  return query.or('is_active.eq.true,is_active.is.null') as T;
}

async function runProductQuery<T>(
  buildQuery: (select: string) => PromiseLike<{ data: T; error: { code?: string; message?: string } | null }>,
  timeoutMessage: string,
) {
  const result = await withServerTimeout(
    buildQuery(FULL_PRODUCT_SELECT),
    SERVER_PRODUCT_QUERY_TIMEOUT_MS,
    timeoutMessage,
  );

  if (!result.error || !isMissingProductRelation(result.error)) {
    return result;
  }

  return withServerTimeout(
    buildQuery(BASIC_PRODUCT_SELECT),
    SERVER_PRODUCT_QUERY_TIMEOUT_MS,
    timeoutMessage,
  );
}


export const productServerService = {
  async getProducts(): Promise<ProductType[]> {
    try {
      const supabase = createPublicServerSupabase();

      const { data, error } = await runProductQuery(
        (select) => onlyVisibleProducts(productSelect(supabase, select)).order('title'),
        'Server product query timed out',
      );

      if (error) {
        console.error('Error fetching products:', error);
        return useDemoData ? sampleProducts : [];
      }

      const products = (data || []) as unknown as ProductType[];

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
      const supabase = createPublicServerSupabase();

      const { data, error } = await runProductQuery(
        (select) => onlyVisibleProducts(productSelect(supabase, select).eq('product_id', id)).maybeSingle(),
        'Server product detail query timed out',
      );

      if (error) {
        console.error('Error fetching product:', error);
        return useDemoData ? findSampleProduct(id) : null;
      }

      return (data as unknown as ProductType) || (useDemoData ? findSampleProduct(id) : null);
    } catch (error) {
      console.error('Error in getProductById:', error);
      return useDemoData ? findSampleProduct(id) : null;
    }
  },

  async getProductBySlug(slug: string): Promise<ProductType | null> {
    try {
      const supabase = createPublicServerSupabase();

      // Search by slug first.
      const { data, error } = await runProductQuery(
        (select) => onlyVisibleProducts(productSelect(supabase, select).eq('slug', slug)).maybeSingle(),
        'Server product slug query timed out',
      );

      if (error) {
        console.error('Error fetching product by slug:', error);
        return useDemoData ? findSampleProduct(slug) : null;
      }

      if (data) {
        return data as unknown as ProductType;
      }

      // Fallback: if URL param is numeric, search by product_id.
      const numericId = Number(slug);

      if (!Number.isNaN(numericId)) {
        const { data: productById, error: idError } = await runProductQuery(
          (select) =>
            onlyVisibleProducts(
              productSelect(supabase, select).eq('product_id', numericId),
            ).maybeSingle(),
          'Server product id query timed out',
        );

        if (idError) {
          console.error('Error fetching product by numeric id:', idError);
          return useDemoData ? findSampleProduct(slug) : null;
        }

        return (productById as unknown as ProductType) || (useDemoData ? findSampleProduct(slug) : null);
      }

      return useDemoData ? findSampleProduct(slug) : null;
    } catch (error) {
      console.error('Error in getProductBySlug:', error);
      return useDemoData ? findSampleProduct(slug) : null;
    }
  },

  async getProductsByCategory(categoryId: number): Promise<ProductType[]> {
    try {
      const supabase = createPublicServerSupabase();

      const { data, error } = await runProductQuery(
        (select) => onlyVisibleProducts(productSelect(supabase, select).eq('category_id', categoryId)).order('title'),
        'Server category product query timed out',
      );

      if (error) {
        console.error('Error fetching products by category:', error);
        return useDemoData
          ? sampleProducts.filter((product) => product.category_id === categoryId)
          : [];
      }

      const products = (data || []) as unknown as ProductType[];
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
      const supabase = createPublicServerSupabase();

      const { data, error } = await runProductQuery(
        (select) => onlyVisibleProducts(productSelect(supabase, select).ilike('title', `%${query}%`)).order('title'),
        'Server product search query timed out',
      );

      if (error) {
        console.error('Error searching products:', error);
        return useDemoData
          ? sampleProducts.filter((product) =>
              product.title.toLowerCase().includes(query.toLowerCase())
            )
          : [];
      }

      const products = useDemoData
        ? mergeWithSampleProducts((data || []) as unknown as ProductType[])
        : ((data || []) as unknown as ProductType[]);

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

