import { supabase } from '@/lib/supabase/client';
import { ProductType, CartItemType, CartType, CartStatus } from '../../types';
import { toast } from 'sonner';
import { getClientUser } from '@/lib/supabase/clientUtils';

const CART_SELECT = 'id, user_id, status, total_items, total_price, created_at, updated_at';
const CART_ITEM_SELECT =
  'id, cart_id, product_id, variant_id, quantity, price, selected_size, selected_color, variant_info, created_at, updated_at';
const CART_ITEM_WITH_PRODUCT_SELECT = `
  ${CART_ITEM_SELECT},
  product:products (
    product_id,
    slug,
    title,
    description,
    material,
    price,
    sale_price,
    image,
    stock,
    sizes,
    colors,
    is_active,
    sku,
    category_id,
    created_at,
    updated_at
  )
`;

export interface CartVariantOptions {
  variantId?: string;
  size?: string;
  color?: string;
  variantInfo?: Record<string, unknown>;
}

interface CartUserOptions {
  userId?: string | null;
}

function isMissingVariantIdColumn(error: { message?: string; code?: string }) {
  const message = `${error.code || ''} ${error.message || ''}`.toLowerCase();
  return (
    message.includes('variant_id') &&
    (message.includes('schema cache') || message.includes('column') || message.includes('could not find'))
  );
}

async function resolveCartUserId(options?: CartUserOptions) {
  if (options?.userId) return options.userId;
  const user = await getClientUser();
  return user?.id ?? null;
}

function normalizeJoinedProduct(product: ProductType | ProductType[] | null | undefined) {
  return Array.isArray(product) ? product[0] : product;
}

export async function getActiveCart(options?: CartUserOptions) {
  try {
    const userId = await resolveCartUserId(options);
    if (!userId) return null;

    const { data, error } = await supabase
      .from('carts')
      .select(CART_SELECT)
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error('Error fetching cart:', error);
      toast.error('Cart operation failed.');
      return null;
    }

    return data as CartType | null;
  } catch (error) {
    console.error('Error in getActiveCart:', error);
    toast.error('Cart operation failed.');
    return null;
  }
}

export async function createCart(options?: CartUserOptions) {
  try {
    const userId = await resolveCartUserId(options);
    if (!userId) throw new Error('Login required for server cart');

    const { data, error } = await supabase
      .from('carts')
      .insert({ user_id: userId, status: 'active' as CartStatus })
      .select(CART_SELECT)
      .single();

    if (error) {
      console.error('Error creating cart:', error);
      toast.error('Cart operation failed.');
      return null;
    }

    return data as CartType;
  } catch (error) {
    console.error('Error in createCart:', error);
    toast.error('Cart operation failed.');
    return null;
  }
}

export async function getOrCreateCart(options?: CartUserOptions) {
  const cart = await getActiveCart(options);
  if (cart) return cart;
  return await createCart(options);
}

export async function getCartItems(cartId: number): Promise<(CartItemType & { product: ProductType })[]> {
  try {
    const { data, error } = await supabase
      .from('cart_items')
      .select(CART_ITEM_WITH_PRODUCT_SELECT)
      .eq('cart_id', cartId);

    if (error) {
      console.error('Error fetching cart items:', error);
      toast.error('Cart operation failed.');
      return [];
    }

    return data.reduce<(CartItemType & { product: ProductType })[]>((items, item) => {
      const product = normalizeJoinedProduct(item.product as ProductType | ProductType[] | null);
      if (!product) return items;

      items.push({
        ...item,
        product,
      } as CartItemType & { product: ProductType });
      return items;
    }, []);
  } catch (error) {
    console.error('Error in getCartItems:', error);
    toast.error('Cart operation failed.');
    return [];
  }
}

export async function addItemToCart(
  cartId: number,
  productId: string,
  price: number,
  quantity: number = 1,
  options: CartVariantOptions = {},
) {
  try {
    const selectedSize = options.size ?? null;
    const selectedColor = options.color ?? null;

    let existingItemQuery = supabase
      .from('cart_items')
      .select(CART_ITEM_SELECT)
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
      toast.error('Cart operation failed.');
      return null;
    }

    if (existingItems && existingItems.length > 0) {
      const existingItem = existingItems[0];
      const newQuantity = existingItem.quantity + quantity;

      const { data, error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
        .eq('id', existingItem.id)
        .select(CART_ITEM_SELECT)
        .single();

      if (error) {
        console.error('Error updating cart item:', error);
        toast.error('Cart operation failed.');
        return null;
      }

      return data as CartItemType;
    }

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

    const { data, error } = await supabase.from('cart_items').insert(insertPayload).select(CART_ITEM_SELECT).single();

    if (error) {
      if (isMissingVariantIdColumn(error)) {
        const { variant_id: _variantId, ...legacyPayload } = insertPayload;
        void _variantId;

        const { data: legacyData, error: legacyError } = await supabase
          .from('cart_items')
          .insert(legacyPayload)
          .select(CART_ITEM_SELECT)
          .single();

        if (!legacyError) return legacyData as CartItemType;

        console.error('Error adding legacy cart item:', legacyError);
        toast.error('Cart operation failed.');
        return null;
      }

      console.error('Error adding item to cart:', error);
      toast.error('Cart operation failed.');
      return null;
    }

    return data as CartItemType;
  } catch (error) {
    console.error('Error in addItemToCart:', error);
    toast.error('Cart operation failed.');
    return null;
  }
}

export async function updateCartItemQuantity(cartItemId: number, quantity: number) {
  try {
    if (quantity <= 0) return await removeCartItem(cartItemId);

    const { data, error } = await supabase
      .from('cart_items')
      .update({ quantity, updated_at: new Date().toISOString() })
      .eq('id', cartItemId)
      .select(CART_ITEM_SELECT)
      .single();

    if (error) {
      console.error('Error updating cart item quantity:', error);
      toast.error('Cart operation failed.');
      return null;
    }

    return data as CartItemType;
  } catch (error) {
    console.error('Error in updateCartItemQuantity:', error);
    toast.error('Cart operation failed.');
    return null;
  }
}

export async function removeCartItem(cartItemId: number) {
  try {
    const { error } = await supabase.from('cart_items').delete().eq('id', cartItemId);

    if (error) {
      console.error('Error removing cart item:', error);
      toast.error('Cart operation failed.');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in removeCartItem:', error);
    toast.error('Cart operation failed.');
    return false;
  }
}

export async function clearCart(cartId: number) {
  try {
    const { error } = await supabase.from('cart_items').delete().eq('cart_id', cartId);

    if (error) {
      console.error('Error clearing cart:', error);
      toast.error('Cart operation failed.');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in clearCart:', error);
    toast.error('Cart operation failed.');
    return false;
  }
}

export async function findCartItemByProductId(cartId: number, productId: string) {
  try {
    const { data, error } = await supabase
      .from('cart_items')
      .select(CART_ITEM_SELECT)
      .eq('cart_id', cartId)
      .eq('product_id', productId)
      .maybeSingle();

    if (error) {
      console.error('Error finding cart item:', error);
      toast.error('Cart operation failed.');
      return null;
    }

    return data as CartItemType | null;
  } catch (error) {
    console.error('Error in findCartItemByProductId:', error);
    toast.error('Cart operation failed.');
    return null;
  }
}
