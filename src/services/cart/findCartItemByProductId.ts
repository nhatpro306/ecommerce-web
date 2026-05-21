import { supabase } from '@/lib/supabase/client';
import { CartItemType } from '@/types';
import { toast } from 'sonner';

export async function findCartItemByProductId(
  cartId: number,
  productId: string
) {
  try {
    const { data, error } = await supabase
      .from('cart_items')
      .select('*')
      .eq('cart_id', cartId)
      .eq('product_id', productId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error finding cart item:', error);
      toast.error('Khong the tim san pham trong gio');
      return null;
    }

    return data as CartItemType | null;
  } catch (error) {
    console.error('Error in findCartItemByProductId:', error);
    toast.error('Co loi xay ra, vui long thu lai');
    return null;
  }
}
