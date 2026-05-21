import { supabase } from '@/lib/supabase/client';
import { ProductType, CartItemType } from '@/types';
import { toast } from 'sonner';

export async function getCartItems(cartId: number) {
  try {
    const { data, error } = await supabase
      .from('cart_items')
      .select(
        `
        *,
        product:products(*)
      `
      )
      .eq('cart_id', cartId);

    if (error) {
      console.error('Error fetching cart items:', error);
      toast.error('Khong the tai san pham trong gio');
      return [];
    }

    return data.map(
      (item: {
        id: number;
        cart_id: number;
        product_id: string;
        quantity: number;
        price: number;
        selected_size?: string | null;
        selected_color?: string | null;
        variant_info?: Record<string, unknown>;
        created_at: string;
        updated_at: string;
        product: ProductType;
      }) => ({
        ...item,
        product: item.product as ProductType,
      })
    ) as (CartItemType & { product: ProductType })[];
  } catch (error) {
    console.error('Error in getCartItems:', error);
    toast.error('Co loi xay ra, vui long thu lai');
    return [];
  }
}
