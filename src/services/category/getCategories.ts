import { CategoryType } from '@/types';
import { categoryService } from '@/services/category/categoryService';

export async function getCategories(): Promise<CategoryType[]> {
  return categoryService.getCategories();
}
