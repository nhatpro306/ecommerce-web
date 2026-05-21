import { AddressType } from "@/types";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { getActiveCart } from "@/services/cart/cartService";

interface OrderItemInput {
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  price: number;
  selected_size?: string | null;
  selected_color?: string | null;
  variant_info?: Record<string, unknown>;
}

interface CreateOrderParams {
  userId: string;
  items: OrderItemInput[];
  shippingAddress: AddressType;
  totalAmount: number;
  paymentIntentId?: string;
  paymentMethod?: "cod" | "bank_transfer";
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerNote?: string;
}

export const orderService = {
  async createOrder({
    userId,
    items,
    shippingAddress,
    totalAmount,
    paymentIntentId,
    paymentMethod = "cod",
    customerName,
    customerPhone,
    customerEmail,
    customerNote,
  }: CreateOrderParams) {
    try {
      // Validate input parameters
      if (!userId) {
        throw new Error("User ID is required");
      }
      if (!items || items.length === 0) {
        throw new Error("Order items are required");
      }
      if (!shippingAddress || !shippingAddress.id) {
        throw new Error("Shipping address is required");
      }
      if (!totalAmount || totalAmount <= 0) {
        throw new Error("Total amount must be greater than 0");
      }

      const activeCart = await getActiveCart();
      const { data: orderId, error: checkoutError } = await supabase.rpc(
        "create_order_checkout",
        {
          payload: {
            cart_id: activeCart?.id,
            shipping_address_id: shippingAddress.id,
            payment_method: paymentMethod,
            payment_id: paymentIntentId,
            customer_name: customerName,
            customer_phone: customerPhone,
            customer_email: customerEmail || null,
            customer_note: customerNote || null,
            items: items.map((item) => ({
              product_id: item.product_id,
              variant_id: item.variant_id,
              quantity: item.quantity,
              selected_size: item.selected_size,
              selected_color: item.selected_color,
            })),
          },
        },
      );

      if (checkoutError) {
        const message = checkoutError.message.includes("Not enough stock")
          ? "Một sản phẩm vừa hết hàng hoặc không đủ tồn kho. Vui lòng kiểm tra lại giỏ hàng."
          : checkoutError.message;
        toast.error(message);
        throw new Error(message);
      }

      const { data: order, error: orderFetchError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId as number)
        .single();

      if (orderFetchError || !order) {
        throw new Error(orderFetchError?.message || "Order was created but could not be loaded");
      }

      return order;
    } catch (error) {
      console.error("Error in createOrder:", error);

      // Re-throw with better error context
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(
          `Unknown error occurred while creating order: ${JSON.stringify(error)}`,
        );
      }
    }
  },

  async getOrders(userId: string) {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        order_items (
          *,
          product:products (*)
        ),
        shipping_address:addresses!shipping_address_id (*)
      `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch orders");
      throw error;
    }
    return data;
  },

  async getOrderById(orderId: string) {
    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        order_items (
          *,
          product:products (*)
        ),
        shipping_address:addresses!shipping_address_id (*)
      `,
      )
      .eq("id", orderId)
      .single();

    if (error) {
      toast.error("Failed to fetch order");
      throw error;
    }
    return data;
  },

  async updateOrderStatus(orderId: string, status: string) {
    const { data, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId)
      .select()
      .single();

    if (error) {
      toast.error("Failed to update order status");
      throw error;
    }
    return data;
  },

  async deleteOrder(orderId: string) {
    // Attempt to delete order; assuming foreign keys handle cascade for order_items
    const { error } = await supabase.from("orders").delete().eq("id", orderId);

    if (error) {
      toast.error("Failed to delete order");
      throw error;
    }
    return true;
  },
};
