import { supabase } from '@/lib/supabase/client';
import { ProductType, CartItemType, CartType, CartStatus } from '../../types';
import type { Json } from "@/types/supabase";
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
  ),
  variant:product_variants (
    id,
    stock,
    is_active
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

type CartVariantStock = {
  id: string;
  stock: number;
  is_active: boolean;
};

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

function normalizeJoinedVariant(variant: CartVariantStock | CartVariantStock[] | null | undefined) {
  return Array.isArray(variant) ? variant[0] : variant;
}

function reportCartError(message: string, error: unknown): never {
  console.error(message, error);
  toast.error('Cart operation failed.');
  throw error instanceof Error ? error : new Error(message);
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
      reportCartError('Error fetching cart:', error);
    }

    return data as CartType | null;
  } catch (error) {
    reportCartError('Error in getActiveCart:', error);
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
      reportCartError('Error creating cart:', error);
    }

    return data as CartType;
  } catch (error) {
    reportCartError('Error in createCart:', error);
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
      reportCartError('Error fetching cart items:', error);
    }

    return data.reduce<(CartItemType & { product: ProductType })[]>((items, item) => {
      const product = normalizeJoinedProduct(item.product as ProductType | ProductType[] | null);
      if (!product) return items;
      const variant = normalizeJoinedVariant(
        (item as unknown as { variant?: CartVariantStock | CartVariantStock[] | null }).variant,
      );

      items.push({
        ...item,
        product: {
          ...product,
          stock: variant?.stock ?? product.stock,
        },
      } as CartItemType & { product: ProductType });
      return items;
    }, []);
  } catch (error) {
    reportCartError('Error in getCartItems:', error);
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
      reportCartError('Error checking existing cart item:', fetchError);
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
        reportCartError('Error updating cart item:', error);
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
      variant_info: (options.variantInfo ?? {}) as Json,
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

        reportCartError('Error adding legacy cart item:', legacyError);
      }

      reportCartError('Error adding item to cart:', error);
    }

    return data as CartItemType;
  } catch (error) {
    reportCartError('Error in addItemToCart:', error);
  }
}

export async function updateCartItemQuantity(cartItemId: number, quantity: number) {
  try {
    if (quantity <= 0) return await removeCartItem(cartItemId);

    const { error: stockError } = await supabase.rpc("validate_cart_item_quantity", {
      p_cart_item_id: cartItemId,
      p_quantity: quantity,
    });

    if (stockError) {
      reportCartError("Error validating cart item stock:", stockError);
    }

    const { data, error } = await supabase
      .from('cart_items')
      .update({ quantity, updated_at: new Date().toISOString() })
      .eq('id', cartItemId)
      .select(CART_ITEM_SELECT)
      .single();

    if (error) {
      reportCartError('Error updating cart item quantity:', error);
    }

    return data as CartItemType;
  } catch (error) {
    reportCartError('Error in updateCartItemQuantity:', error);
  }
}

export async function removeCartItem(cartItemId: number) {
  try {
    const { error } = await supabase.from('cart_items').delete().eq('id', cartItemId);

    if (error) {
      reportCartError('Error removing cart item:', error);
    }

    return true;
  } catch (error) {
    reportCartError('Error in removeCartItem:', error);
  }
}

export async function clearCart(cartId: number) {
  try {
    const { error } = await supabase.from('cart_items').delete().eq('cart_id', cartId);

    if (error) {
      reportCartError('Error clearing cart:', error);
    }

    return true;
  } catch (error) {
    reportCartError('Error in clearCart:', error);
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
      reportCartError('Error finding cart item:', error);
    }

    return data as CartItemType | null;
  } catch (error) {
    reportCartError('Error in findCartItemByProductId:', error);
  }
}
