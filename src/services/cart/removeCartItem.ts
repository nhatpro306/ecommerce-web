import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

export async function removeCartItem(cartItemId: number) {
  try {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', cartItemId);

    if (error) {
      console.error('Error removing cart item:', error);
      toast.error('Khong the xoa san pham khoi gio');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in removeCartItem:', error);
    toast.error('Co loi xay ra, vui long thu lai');
    return false;
  }
}
