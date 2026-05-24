import { supabase } from '@/lib/supabase/client';
import { CategoryType } from '../../types';
import { isNoRowsError, toUserFacingQueryError } from '@/utils/errorHandling';
import { withTimeout } from '@/utils/withTimeout';

const CATEGORY_QUERY_TIMEOUT_MS = 4000;

export const categoryService = {
  async getCategories(): Promise<CategoryType[]> {
    try {
      const { data, error } = await withTimeout(
        supabase.from('categories').select('*').order('name'),
        CATEGORY_QUERY_TIMEOUT_MS,
        'Không thể tải danh mục. Kết nối Supabase phản hồi quá lâu.',
      );

      if (error) {
        throw toUserFacingQueryError('Categories', error);
      }

      return data as CategoryType[];
    } catch (error) {
      throw error instanceof Error
        ? error
        : toUserFacingQueryError('Categories', {});
    }
  },

  async getCategoryById(id: number): Promise<CategoryType | null> {
    try {
      const { data, error } = await withTimeout(
        supabase.from('categories').select('*').eq('id', id).single(),
        CATEGORY_QUERY_TIMEOUT_MS,
        'Không thể tải danh mục. Kết nối Supabase phản hồi quá lâu.',
      );

      if (error) {
        if (isNoRowsError(error)) {
          return null;
        }
        throw toUserFacingQueryError('Category', error);
      }

      return data as CategoryType;
    } catch (error) {
      throw error instanceof Error
        ? error
        : toUserFacingQueryError('Category', {});
    }
  },
};
