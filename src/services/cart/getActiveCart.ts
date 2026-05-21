import { supabase } from '@/lib/supabase/client';
import { CartType } from '@/types';
import { toast } from 'sonner';
import { getClientUser } from '@/lib/supabase/clientUtils';

export async function getActiveCart() {
  try {
    const user = await getClientUser();
    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from('carts')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching cart:', error);
      toast.error('Khong the tai gio hang');
      return null;
    }

    return data as CartType | null;
  } catch (error) {
    console.error('Error in getActiveCart:', error);
    toast.error('Co loi xay ra, vui long thu lai');
    return null;
  }
}
