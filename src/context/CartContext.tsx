'use client';
import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from 'react';
import { ProductType } from '../types';
import * as cartService from '@/services/cart/cartService';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { isPubliclyVisibleProduct } from '@/utils/productVisibility';

const LOCAL_CART_STORAGE_KEY = 'resey-local-cart';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Define CartItem interface extending ProductType with quantity for UI consumption
export interface CartItem extends ProductType {
  quantity: number;
  cart_item_id?: number; // Database ID for the cart item
  variant_id?: string | null;
  selected_size?: string | null;
  selected_color?: string | null;
  variant_info?: Record<string, unknown>;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (
    product: ProductType,
    options?: {
      size?: string;
      color?: string;
      quantity?: number;
      variantId?: string | null;
      sku?: string | null;
    }
  ) => Promise<boolean>;
  removeFromCart: (productId: string, cartItemId?: number) => void;
  updateQuantity: (
    productId: string,
    amount: number,
    cartItemId?: number
  ) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function isSupabaseProductId(productId: string): boolean {
  return UUID_PATTERN.test(productId);
}

function getCartItemKey(
  productId: string,
  size?: string | null,
  color?: string | null
): string {
  return `${productId}::${size ?? ''}::${color ?? ''}`;
}

function isLocalCartItem(item: CartItem): boolean {
  return item.variant_info?.localCart === true || !isSupabaseProductId(item.product_id);
}

function readLocalCart(): CartItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const storedCart = window.localStorage.getItem(LOCAL_CART_STORAGE_KEY);
    return storedCart ? (JSON.parse(storedCart) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function writeLocalCart(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_CART_STORAGE_KEY, JSON.stringify(items));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCartId, setActiveCartId] = useState<number | null>(null);
  const { user } = useAuth();

  const addToLocalCart = (
    product: ProductType,
    quantity: number,
    selectedSize: string | null,
    selectedColor: string | null,
    selectedVariantId: string | null,
    selectedSku: string | null,
    targetKey: string
  ) => {
    setCartItems((previousItems) => {
      const existingItemIndex = previousItems.findIndex(
        (item) =>
          getCartItemKey(
            item.product_id,
            item.selected_size,
            item.selected_color
          ) === targetKey
      );

      const nextItems =
        existingItemIndex === -1
          ? [
              ...previousItems,
              {
                ...product,
                quantity,
                variant_id: selectedVariantId,
                selected_size: selectedSize,
                selected_color: selectedColor,
                variant_info: {
                  size: selectedSize,
                  color: selectedColor,
                  sku: selectedSku,
                  localCart: true,
                },
              },
            ]
          : previousItems.map((item, index) =>
              index === existingItemIndex
                ? { ...item, quantity: item.quantity + quantity }
                : item
            );

      writeLocalCart(nextItems);
      return nextItems;
    });
  };

  // Load cart from database when user changes
  useEffect(() => {
    async function loadCart() {
      if (!user) {
        // Guest/sample cart is stored locally so the MVP can run without auth.
        setCartItems(readLocalCart());
        setActiveCartId(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const cart = await cartService.getOrCreateCart({ userId: user.id });
        if (cart) {
          setActiveCartId(cart.id);

          const localItems = readLocalCart();
          if (localItems.length > 0) {
            await Promise.all(
              localItems.map((item) =>
                cartService
                  .addItemToCart(cart.id, item.product_id, item.price, item.quantity, {
                    size: item.selected_size ?? undefined,
                    color: item.selected_color ?? undefined,
                    variantId: item.variant_id ?? undefined,
                    variantInfo: {
                      size: item.selected_size,
                      color: item.selected_color,
                    },
                  })
                  .catch((error) => {
                    console.warn("Failed to sync local cart item:", error);
                  }),
              ),
            );
            writeLocalCart([]);
          }

          const items = await cartService.getCartItems(cart.id);
          const formattedItems: CartItem[] = items.map((item) => ({
            ...item.product,
            quantity: item.quantity,
            cart_item_id: item.id,
            variant_id: item.variant_id,
            selected_size: item.selected_size,
            selected_color: item.selected_color,
            variant_info: item.variant_info,
          }));

          setCartItems(formattedItems);
          setSubtotal(cart.total_price);
          setTotalItems(cart.total_items);
        }
      } catch (error) {
        console.error('Error loading cart:', error);
        toast.error('Không thể tải giỏ hàng của bạn');
      } finally {
        setIsLoading(false);
      }
    }

    loadCart();
  }, [user]);

  // Calculate totals when cartItems change
  useEffect(() => {
    if (!isLoading) {
      const total = cartItems.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0
      );
      setSubtotal(total);

      const itemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
      setTotalItems(itemCount);
    }
  }, [cartItems, isLoading]);

  const addToCart = async (
    product: ProductType,
    options?: {
      size?: string;
      color?: string;
      quantity?: number;
      variantId?: string | null;
      sku?: string | null;
    }
  ): Promise<boolean> => {
    const quantity = Math.max(1, options?.quantity ?? 1);
    const selectedSize = options?.size ?? null;
    const selectedColor = options?.color ?? null;
    const selectedVariantId = options?.variantId ?? null;
    const selectedSku = options?.sku ?? product.sku ?? null;
    const shouldUseLocalCart = !user || !isSupabaseProductId(product.product_id);
    const isVisibleProduct = isPubliclyVisibleProduct(product);

    const targetKey = getCartItemKey(product.product_id, selectedSize, selectedColor);
    const existingQuantity = cartItems
      .filter(
        (item) =>
          getCartItemKey(item.product_id, item.selected_size, item.selected_color) ===
          targetKey
      )
      .reduce((total, item) => total + item.quantity, 0);

    if (!isVisibleProduct) {
      toast.error('Sản phẩm hiện không khả dụng để thêm vào giỏ');
      return false;
    }

    if (product.stock <= 0) {
      toast.error('Sản phẩm đã hết hàng');
      return false;
    }

    if (existingQuantity + quantity > product.stock) {
      toast.error('Số lượng trong giỏ vượt quá tồn kho hiện tại');
      return false;
    }

    if (shouldUseLocalCart) {
      addToLocalCart(
        product,
        quantity,
        selectedSize,
        selectedColor,
        selectedVariantId,
        selectedSku,
        targetKey
      );
        toast.success('Đã thêm vào giỏ');
        return true;
      }

    let cartId = activeCartId;
    if (!cartId) {
      const cart = await cartService.createCart({ userId: user?.id ?? null });
      if (!cart) {
        toast.error('Không thể tạo giỏ hàng');
        return false;
      }
      cartId = cart.id;
      setActiveCartId(cartId);
    }

    try {
      // Add item to database
      const result = await cartService.addItemToCart(
        cartId,
        product.product_id,
        product.price,
        quantity,
        {
          size: selectedSize ?? undefined,
          color: selectedColor ?? undefined,
          variantId: selectedVariantId ?? undefined,
          variantInfo: {
            size: selectedSize,
            color: selectedColor,
            sku: selectedSku,
          },
        }
      );

      if (result) {
        // Find the item in current cart items
        const existingItemIndex = cartItems.findIndex(
          (item) =>
            item.product_id === product.product_id &&
            (item.selected_size ?? null) === selectedSize &&
            (item.selected_color ?? null) === selectedColor
        );

        if (existingItemIndex !== -1) {
          // Update existing item
          const updatedItems = [...cartItems];
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: updatedItems[existingItemIndex].quantity + quantity,
            cart_item_id: result.id,
          };
          setCartItems(updatedItems);
        } else {
          // Add new item
          setCartItems([
            ...cartItems,
            {
              ...product,
              quantity,
              cart_item_id: result.id,
              variant_id: result.variant_id,
              selected_size: selectedSize,
              selected_color: selectedColor,
              variant_info: result.variant_info,
            },
          ]);
        }

        toast.success('Đã thêm vào giỏ');
        return true;
      }

      // If DB add failed (e.g. transient auth lock), fall back to local cart
      addToLocalCart(
        product,
        quantity,
        selectedSize,
        selectedColor,
        selectedVariantId,
        selectedSku,
        targetKey
      );
      toast.success('Đã thêm vào giỏ');
      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Không thể thêm sản phẩm vào giỏ');
    }

    return false;
  };

  const removeFromCart = async (productId: string, cartItemId?: number) => {
    try {
      // Find the cart item
      const itemToRemove = cartItems.find(
        (item) =>
          cartItemId
            ? item.cart_item_id === cartItemId
            : item.product_id === productId
      );

      if (!itemToRemove) return;

      if (isLocalCartItem(itemToRemove) || !itemToRemove.cart_item_id || !activeCartId) {
        setCartItems((previousItems) => {
          const nextItems = previousItems.filter((item) => item !== itemToRemove);
          writeLocalCart(nextItems);
          return nextItems;
        });
        toast.success('Đã xóa sản phẩm khỏi giỏ');
        return;
      }

      if (itemToRemove.cart_item_id) {
        // Remove from database
        const success = await cartService.removeCartItem(
          itemToRemove.cart_item_id
        );

        if (success) {
          // Remove from local state
          setCartItems((prev) =>
            prev.filter((item) =>
              cartItemId
                ? item.cart_item_id !== cartItemId
                : item.product_id !== productId
            )
          );
          toast.success('Đã xóa sản phẩm khỏi giỏ');
        }
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast.error('Không thể xóa sản phẩm khỏi giỏ');
    }
  };

  const updateQuantity = async (
    productId: string,
    amount: number,
    cartItemId?: number
  ) => {
    try {
      // Find the item in cart
      const itemToUpdate = cartItems.find(
        (item) =>
          cartItemId
            ? item.cart_item_id === cartItemId
            : item.product_id === productId
      );

      if (!itemToUpdate) return;

      const newQuantity = itemToUpdate.quantity + amount;

      if (newQuantity <= 0) {
        // If new quantity is zero or less, remove the item
        await removeFromCart(productId, cartItemId);
        return;
      }

      if (newQuantity > itemToUpdate.stock) {
        toast.error('Số lượng trong giỏ vượt quá tồn kho hiện tại');
        return;
      }

      if (isLocalCartItem(itemToUpdate) || !itemToUpdate.cart_item_id || !activeCartId) {
        setCartItems((previousItems) => {
          const nextItems = previousItems.map((item) => {
            const isTarget = cartItemId
              ? item.cart_item_id === cartItemId
              : item.product_id === productId &&
                item.selected_size === itemToUpdate.selected_size &&
                item.selected_color === itemToUpdate.selected_color;

            return isTarget ? { ...item, quantity: newQuantity } : item;
          });
          writeLocalCart(nextItems);
          return nextItems;
        });
        return;
      }

      // Update in database
      const result = await cartService.updateCartItemQuantity(
        itemToUpdate.cart_item_id,
        newQuantity
      );

      if (result) {
        // Update in local state
        setCartItems((prev) =>
          prev.map((item) => {
            const isTarget = cartItemId
              ? item.cart_item_id === cartItemId
              : item.product_id === productId;

            return isTarget ? { ...item, quantity: newQuantity } : item;
          })
        );
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Không thể cập nhật số lượng');
    }
  };

  const clearCart = async () => {
    if (!activeCartId) {
      setCartItems([]);
      writeLocalCart([]);
      return;
    }

    try {
      const success = await cartService.clearCart(activeCartId);

      if (success) {
        setCartItems([]);
        writeLocalCart([]);
        toast.success('Đã xóa giỏ hàng');
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast.error('Không thể xóa giỏ hàng');
    }
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        isLoading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
