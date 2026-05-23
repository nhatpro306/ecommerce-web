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
      if (!userId) {
        throw new Error("Vui lòng đăng nhập để đặt hàng.");
      }
      if (!items || items.length === 0) {
        throw new Error("Giỏ hàng đang trống. Vui lòng thêm sản phẩm trước khi đặt hàng.");
      }
      if (!shippingAddress || !shippingAddress.id) {
        throw new Error("Vui lòng nhập đầy đủ địa chỉ giao hàng.");
      }
      if (!totalAmount || totalAmount <= 0) {
        throw new Error("Tổng tiền không hợp lệ. Vui lòng kiểm tra lại giỏ hàng.");
      }

      const sanitizedItems = items
        .filter((item) => item.product_id && item.quantity > 0)
        .map((item) => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          selected_size: item.selected_size,
          selected_color: item.selected_color,
        }));

      if (sanitizedItems.length === 0) {
        throw new Error("Giỏ hàng đang trống. Vui lòng thêm sản phẩm trước khi đặt hàng.");
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
            items: sanitizedItems,
          },
        },
      );

      if (checkoutError) {
        const raw = checkoutError.message || "";
        let message = "Đặt hàng thất bại, vui lòng thử lại.";

        if (raw.includes("Checkout requires at least one item")) {
          message = "Giỏ hàng đang trống. Vui lòng thêm sản phẩm trước khi đặt hàng.";
        } else if (
          raw.includes("Not enough stock") ||
          raw.includes("Variant is no longer available")
        ) {
          message = "Một sản phẩm vừa hết hàng hoặc không đủ tồn kho. Vui lòng kiểm tra lại giỏ hàng.";
        } else if (raw.includes("Shipping address does not belong")) {
          message = "Địa chỉ giao hàng không hợp lệ. Vui lòng thử lại.";
        } else if (raw.includes("Authentication required")) {
          message = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
        } else if (raw) {
          message = raw;
        }

        toast.error(message);
        throw new Error(message);
      }

      const { data: order, error: orderFetchError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId as number)
        .single();

      if (orderFetchError || !order) {
        throw new Error(
          "Đơn hàng đã được tạo nhưng không thể tải lại. Vui lòng kiểm tra trong trang đơn hàng.",
        );
      }

      return order;
    } catch (error) {
      console.error("Error in createOrder:", error);

      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Đặt hàng thất bại, vui lòng thử lại.");
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
      toast.error("Không thể tải đơn hàng");
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
      toast.error("Không thể tải chi tiết đơn hàng");
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
      toast.error("Không thể cập nhật trạng thái đơn hàng");
      throw error;
    }
    return data;
  },

  async deleteOrder(orderId: string) {
    // Attempt to delete order; assuming foreign keys handle cascade for order_items
    const { error } = await supabase.from("orders").delete().eq("id", orderId);

    if (error) {
      toast.error("Không thể xóa đơn hàng");
      throw error;
    }
    return true;
  },
};
