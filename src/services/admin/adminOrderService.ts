import { supabase } from "@/lib/supabase/client";
import { OrderItemType, OrderType } from "@/types";

interface OrderItemRow extends Omit<OrderItemType, "product"> {
  products?: {
    product_id: string;
    title: string;
    image?: string;
  } | null;
}

interface CustomerStat {
  userId: string;
  username: string;
  email: string;
  totalOrders: number;
  totalSpent: number;
}

export interface OrderWithDetails extends Omit<OrderType, "order_items"> {
  profile?: {
    username: string;
    email: string;
  };
  shipping_address?: {
    street: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
  };
  order_items?: OrderItemType[];
}

export interface OrderFilters {
  status?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface OrderAnalytics {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Record<string, number>;
  recentOrders: OrderWithDetails[];
  topCustomers: CustomerStat[];
}

function applyOrderFilters<T extends { eq: Function; gte: Function; lte: Function }>(
  query: T,
  filters: OrderFilters,
): T {
  let nextQuery = query;

  if (filters.status) nextQuery = nextQuery.eq("status", filters.status) as T;
  if (filters.userId) nextQuery = nextQuery.eq("user_id", filters.userId) as T;
  if (filters.dateFrom) nextQuery = nextQuery.gte("created_at", filters.dateFrom) as T;
  if (filters.dateTo) nextQuery = nextQuery.lte("created_at", filters.dateTo) as T;
  if (filters.minAmount) nextQuery = nextQuery.gte("total", filters.minAmount) as T;
  if (filters.maxAmount) nextQuery = nextQuery.lte("total", filters.maxAmount) as T;

  return nextQuery;
}

/**
 * Admin service for order reads. Status mutations are handled by server actions
 * so role checks happen on the server.
 */
export const adminOrderService = {
  async getAllOrders(
    filters: OrderFilters = {},
    page: number = 1,
    limit: number = 50,
  ): Promise<{ orders: OrderWithDetails[]; total: number }> {
    try {
      let query = supabase.from("orders").select(`
        *,
        profiles!orders_user_id_fkey (
          username,
          email
        ),
        addresses!orders_shipping_address_id_fkey (
          street,
          city,
          state,
          zip_code,
          country
        ),
        order_items (
          id,
          order_id,
          product_id,
          variant_id,
          quantity,
          price,
          selected_size,
          selected_color,
          product_title_snapshot,
          product_image_snapshot,
          sku_snapshot,
          size_snapshot,
          color_snapshot,
          products (
            product_id,
            title,
            image
          )
        )
      `);

      query = applyOrderFilters(query, filters);

      let countQuery = supabase
        .from("orders")
        .select("*", { count: "exact", head: true });
      countQuery = applyOrderFilters(countQuery, filters);
      const { count } = await countQuery;

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) {
        console.error("Error fetching all orders:", error);
        throw error;
      }

      const orders: OrderWithDetails[] = (data || []).map((order) => ({
        ...order,
        profile: order.profiles,
        shipping_address: order.addresses,
        order_items: (order.order_items as OrderItemRow[] | undefined)?.map((item) => ({
          ...item,
          product: item.products,
        })),
      }));

      return {
        orders,
        total: count || 0,
      };
    } catch (err) {
      console.error("Failed to get all orders:", err);
      throw err;
    }
  },

  async getOrderDetails(orderId: number): Promise<OrderWithDetails | null> {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          profiles!orders_user_id_fkey (
            username,
            email
          ),
          addresses!orders_shipping_address_id_fkey (
            street,
            city,
            state,
            zip_code,
            country
          ),
          order_items (
            id,
            order_id,
            product_id,
            variant_id,
            quantity,
            price,
            selected_size,
            selected_color,
            product_title_snapshot,
            product_image_snapshot,
            sku_snapshot,
            size_snapshot,
            color_snapshot,
            products (
              product_id,
              title,
              image
            )
          )
        `,
        )
        .eq("id", orderId)
        .single();

      if (error) {
        console.error("Error fetching order details:", error);
        throw error;
      }

      return {
        ...data,
        profile: data.profiles,
        shipping_address: data.addresses,
        order_items: (data.order_items as OrderItemRow[] | undefined)?.map((item) => ({
          ...item,
          product: item.products,
        })),
      } as OrderWithDetails;
    } catch (err) {
      console.error("Failed to get order details:", err);
      return null;
    }
  },

  async updateOrderStatus(orderId: number, status: string): Promise<OrderType> {
    try {
      const validStatuses = [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ];

      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status: ${status}`);
      }

      const { data, error } = await supabase
        .from("orders")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .select()
        .single();

      if (error) {
        console.error("Error updating order status:", error);
        throw error;
      }

      return data;
    } catch (err) {
      console.error("Failed to update order status:", err);
      throw err;
    }
  },

  async getOrderAnalytics(): Promise<OrderAnalytics> {
    try {
      const { data: orders, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          profiles (
            username,
            email
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching orders for analytics:", error);
        throw error;
      }

      const allOrders = orders || [];
      const totalOrders = allOrders.length;
      const totalRevenue = allOrders.reduce(
        (sum, order) => sum + order.total,
        0,
      );
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const ordersByStatus = allOrders.reduce(
        (acc, order) => {
          acc[order.status] = (acc[order.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const recentOrders = allOrders.slice(0, 10).map((order) => ({
        ...order,
        profile: order.profiles,
      }));

      const customerStats = allOrders.reduce<Record<string, CustomerStat>>(
        (acc, order) => {
          const userId = order.user_id;
          if (!acc[userId]) {
            acc[userId] = {
              userId,
              username: order.profiles?.username || "Unknown",
              email: order.profiles?.email || "Unknown",
              totalOrders: 0,
              totalSpent: 0,
            };
          }
          acc[userId].totalOrders += 1;
          acc[userId].totalSpent += order.total;
          return acc;
        },
        {},
      );

      const topCustomers: CustomerStat[] = Object.values(customerStats)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

      return {
        totalOrders,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        averageOrderValue: Number(averageOrderValue.toFixed(2)),
        ordersByStatus,
        recentOrders,
        topCustomers,
      };
    } catch (err) {
      console.error("Failed to get order analytics:", err);
      return {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        ordersByStatus: {},
        recentOrders: [],
        topCustomers: [],
      };
    }
  },

  async cancelOrder(orderId: number): Promise<OrderType> {
    return this.updateOrderStatus(orderId, "cancelled");
  },

  async getOrdersRequiringAttention(): Promise<OrderWithDetails[]> {
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          profiles (
            username,
            email
          )
        `,
        )
        .or(
          `status.eq.pending.and.created_at.lt.${threeDaysAgo.toISOString()},status.eq.processing.and.created_at.lt.${threeDaysAgo.toISOString()}`,
        )
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching orders requiring attention:", error);
        throw error;
      }

      return (data || []).map((order) => ({
        ...order,
        profile: order.profiles,
      }));
    } catch (err) {
      console.error("Failed to get orders requiring attention:", err);
      return [];
    }
  },
};


