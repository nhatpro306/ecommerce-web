import { supabase } from '@/lib/supabase/client';
import { ProductType, CartItemType, CartType, CartStatus } from '../../types';
import { toast } from 'sonner';
import { getClientUser } from '@/lib/supabase/clientUtils';

export interface CartVariantOptions {
  variantId?: string;
  size?: string;
  color?: string;
  variantInfo?: Record<string, unknown>;
}

function isMissingVariantIdColumn(error: { message?: string; code?: string }) {
  const message = `${error.code || ""} ${error.message || ""}`.toLowerCase();
  return (
    message.includes("variant_id") &&
    (message.includes("schema cache") ||
      message.includes("column") ||
      message.includes("could not find"))
  );
}

// Get the active cart for the current user
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
      .maybeSingle();

    if (error) {
      console.error('Error fetching cart:', error);
      toast.error('Không thể tải giỏ hàng');
      return null;
    }

    return data as CartType | null;
  } catch (error) {
    console.error('Error in getActiveCart:', error);
    toast.error('Có lỗi xảy ra khi tải giỏ hàng');
    return null;
  }
}

// Create a new cart for the current user
export async function createCart() {
  try {
    const user = await getClientUser();
    if (!user) {
      throw new Error('Bạn cần đăng nhập để dùng giỏ hàng');
    }

    const { data, error } = await supabase
      .from('carts')
      .insert({
        user_id: user.id,
        status: 'active' as CartStatus,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating cart:', error);
      toast.error('Không thể tạo giỏ hàng');
      return null;
    }

    return data as CartType;
  } catch (error) {
    console.error('Error in createCart:', error);
    toast.error('Có lỗi xảy ra khi tạo giỏ hàng');
    return null;
  }
}

// Get or create an active cart
export async function getOrCreateCart() {
  const cart = await getActiveCart();
  if (cart) {
    return cart;
  }
  return await createCart();
}

// Get cart items with product details
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
      toast.error('Không thể tải sản phẩm trong giỏ');
      return [];
    }

    return data.map(
      (item: {
        id: number;
        cart_id: number;
        product_id: string;
        variant_id?: string | null;
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
    toast.error('Có lỗi xảy ra khi tải sản phẩm trong giỏ');
    return [];
  }
}

// Add item to cart
export async function addItemToCart(
  cartId: number,
  productId: string,
  price: number,
  quantity: number = 1,
  options: CartVariantOptions = {}
) {
  try {
    const selectedSize = options.size ?? null;
    const selectedColor = options.color ?? null;

    // Variants must be matched by product + selected size + selected color.
    let existingItemQuery = supabase
      .from('cart_items')
      .select('*')
      .eq('cart_id', cartId)
      .eq('product_id', productId);

    existingItemQuery = selectedSize
      ? existingItemQuery.eq('selected_size', selectedSize)
      : existingItemQuery.is('selected_size', null);

    existingItemQuery = selectedColor
      ? existingItemQuery.eq('selected_color', selectedColor)
      : existingItemQuery.is('selected_color', null);

    const { data: existingItems, error: fetchError } = await existingItemQuery;

    if (fetchError) {
      console.error('Error checking existing cart item:', fetchError);
      toast.error('Không thể kiểm tra giỏ hàng');
      return null;
    }

    if (existingItems && existingItems.length > 0) {
      // Update existing item quantity
      const existingItem = existingItems[0];
      const newQuantity = existingItem.quantity + quantity;

      const { data, error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
        .eq('id', existingItem.id)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating cart item:', error);
        toast.error('Không thể cập nhật giỏ hàng');
        return null;
      }

      return data as CartItemType;
    } else {
      // Insert new item
      const insertPayload = {
        cart_id: cartId,
        product_id: productId,
        variant_id: options.variantId ?? null,
        quantity,
        price,
        selected_size: selectedSize,
        selected_color: selectedColor,
        variant_info: options.variantInfo ?? {},
      };

      const { data, error } = await supabase
        .from('cart_items')
        .insert(insertPayload)
        .select('*')
        .single();

      if (error) {
        if (isMissingVariantIdColumn(error)) {
          // Compatibility path for databases that have not applied the
          // variant_id cart migration yet. Size/color are still persisted.
          const { variant_id: _variantId, ...legacyPayload } = insertPayload;
          void _variantId;

          const { data: legacyData, error: legacyError } = await supabase
            .from('cart_items')
            .insert(legacyPayload)
            .select('*')
            .single();

          if (!legacyError) {
            return legacyData as CartItemType;
          }

          console.error('Error adding legacy cart item:', legacyError);
          toast.error('Không thể thêm sản phẩm vào giỏ. Vui lòng kiểm tra cấu hình database.');
          return null;
        }

        console.error('Error adding item to cart:', error);
        toast.error('Không thể thêm sản phẩm vào giỏ');
        return null;
      }

      return data as CartItemType;
    }
  } catch (error) {
    console.error('Error in addItemToCart:', error);
    toast.error('Có lỗi xảy ra khi thêm sản phẩm vào giỏ');
    return null;
  }
}

// Update cart item quantity
export async function updateCartItemQuantity(
  cartItemId: number,
  quantity: number
) {
  try {
    if (quantity <= 0) {
      // If quantity is 0 or less, remove the item
      return await removeCartItem(cartItemId);
    }

    const { data, error } = await supabase
      .from('cart_items')
      .update({ quantity, updated_at: new Date().toISOString() })
      .eq('id', cartItemId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating cart item quantity:', error);
      toast.error('Không thể cập nhật số lượng');
      return null;
    }

    return data as CartItemType;
  } catch (error) {
    console.error('Error in updateCartItemQuantity:', error);
    toast.error('Có lỗi xảy ra khi cập nhật số lượng');
    return null;
  }
}

// Remove item from cart
export async function removeCartItem(cartItemId: number) {
  try {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', cartItemId);

    if (error) {
      console.error('Error removing cart item:', error);
      toast.error('Không thể xóa sản phẩm khỏi giỏ');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in removeCartItem:', error);
    toast.error('Có lỗi xảy ra khi xóa sản phẩm khỏi giỏ');
    return false;
  }
}

// Clear all items from cart
export async function clearCart(cartId: number) {
  try {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cartId);

    if (error) {
      console.error('Error clearing cart:', error);
      toast.error('Không thể xóa giỏ hàng');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in clearCart:', error);
    toast.error('Có lỗi xảy ra khi xóa giỏ hàng');
    return false;
  }
}

// Find cart item by product ID
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
      .maybeSingle();

    if (error) {
      console.error('Error finding cart item:', error);
      toast.error('Không thể tìm sản phẩm trong giỏ');
      return null;
    }

    return data as CartItemType | null;
  } catch (error) {
    console.error('Error in findCartItemByProductId:', error);
    toast.error('Có lỗi xảy ra khi tìm sản phẩm trong giỏ');
    return null;
  }
}
