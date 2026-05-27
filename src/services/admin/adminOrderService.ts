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

interface OrderJoinRow extends OrderType {
  profiles?: {
    username?: string | null;
    email?: string | null;
  } | null;
  addresses?: {
    street: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
  } | null;
  order_items?: OrderItemRow[];
}

export interface OrderWithDetails extends Omit<OrderType, "order_items"> {
  profile?: {
    username?: string | null;
    email?: string | null;
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
  todayOrders: number;
  todayRevenue: number;
}

export interface DashboardOrderAnalytics {
  totalOrders: number;
  ordersByStatus: Record<string, number>;
  recentOrders: OrderWithDetails[];
  todayOrders: number;
  todayRevenue: number;
}

const ORDER_BASE_SELECT = `
  id,
  user_id,
  status,
  total,
  shipping_address_id,
  payment_method,
  payment_id,
  customer_name,
  customer_phone,
  customer_email,
  customer_note,
  created_at,
  updated_at
`;

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

function isJoinOrPolicyError(error: { code?: string; message?: string } | null) {
  const message = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
  return (
    message.includes("pgrst200") ||
    message.includes("schema cache") ||
    message.includes("relationship") ||
    message.includes("permission denied") ||
    message.includes("row-level security") ||
    message.includes("profiles") ||
    message.includes("addresses") ||
    message.includes("order_items") ||
    message.includes("products")
  );
}

function mapJoinedOrder(order: OrderJoinRow): OrderWithDetails {
  return {
    ...order,
    profile: order.profiles || undefined,
    shipping_address: order.addresses || undefined,
    order_items: order.order_items?.map((item): OrderItemType => {
      const { products, ...orderItem } = item;
      return {
        ...orderItem,
        product: normalizeOrderItemProduct(products),
      };
    }),
  };
}

function normalizeOrderItemProduct(
  products: OrderItemRow["products"] | OrderItemRow["products"][],
): OrderItemType["product"] {
  const product = Array.isArray(products) ? products[0] : products;
  return product || undefined;
}

function normalizeOrderProfile(
  profile:
    | { username?: string | null; email?: string | null }
    | { username?: string | null; email?: string | null }[]
    | null
    | undefined,
) {
  return Array.isArray(profile) ? profile[0] : profile;
}

async function attachBestEffortOrderDetails(
  orders: OrderWithDetails[],
): Promise<OrderWithDetails[]> {
  if (orders.length === 0) return orders;

  const orderIds = orders.map((order) => order.id);
  const userIds = Array.from(new Set(orders.map((order) => order.user_id).filter(Boolean)));
  const addressIds = Array.from(
    new Set(
      orders
        .map((order) => order.shipping_address_id)
        .filter((id): id is number => Number.isFinite(Number(id))),
    ),
  );

  const [itemsResult, profilesResult, addressesResult] = await Promise.all([
    supabase
      .from("order_items")
      .select(
        `
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
      `,
      )
      .in("order_id", orderIds),
    userIds.length > 0
      ? supabase.from("profiles").select("profile_id, username, email").in("profile_id", userIds)
      : Promise.resolve({ data: [], error: null }),
    addressIds.length > 0
      ? supabase
          .from("addresses")
          .select("id, street, city, state, zip_code, country")
          .in("id", addressIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  let itemsByOrder: Record<number, OrderItemType[]> = {};
  if (!itemsResult.error) {
    itemsByOrder = ((itemsResult.data || []) as unknown as OrderItemRow[]).reduce(
      (acc, item) => {
        const { products, ...orderItem } = item;
        acc[item.order_id] = acc[item.order_id] || [];
        acc[item.order_id].push({
          ...orderItem,
          product: normalizeOrderItemProduct(products),
        });
        return acc;
      },
      {} as Record<number, OrderItemType[]>,
    );
  } else {
    console.warn("Admin orders: order item details unavailable:", itemsResult.error.message);
  }

  const profilesById = !profilesResult.error
    ? ((profilesResult.data || []) as Array<{
        profile_id: string;
        username: string;
        email: string;
      }>).reduce(
        (acc, profile) => {
          acc[profile.profile_id] = {
            username: profile.username,
            email: profile.email,
          };
          return acc;
        },
        {} as Record<string, { username: string; email: string }>,
      )
    : {};

  if (profilesResult.error) {
    console.warn("Admin orders: customer profile details unavailable:", profilesResult.error.message);
  }

  const addressesById = !addressesResult.error
    ? ((addressesResult.data || []) as Array<{
        id: number;
        street: string;
        city: string;
        state: string;
        zip_code: string;
        country: string;
      }>).reduce(
        (acc, address) => {
          acc[address.id] = address;
          return acc;
        },
        {} as Record<number, OrderWithDetails["shipping_address"]>,
      )
    : {};

  if (addressesResult.error) {
    console.warn("Admin orders: shipping address details unavailable:", addressesResult.error.message);
  }

  return orders.map((order) => ({
    ...order,
    profile: profilesById[order.user_id] || order.profile,
    shipping_address: addressesById[order.shipping_address_id] || order.shipping_address,
    order_items: itemsByOrder[order.id] || order.order_items || [],
  }));
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
        .select("id", { count: "exact", head: true });
      countQuery = applyOrderFilters(countQuery, filters);
      const { count } = await countQuery;

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) {
        if (isJoinOrPolicyError(error)) {
          let basicQuery = supabase.from("orders").select(ORDER_BASE_SELECT);
          basicQuery = applyOrderFilters(basicQuery, filters);
          const { data: basicData, error: basicError } = await basicQuery
            .order("created_at", { ascending: false })
            .range((page - 1) * limit, page * limit - 1);

          if (basicError) {
            throw basicError;
          }

          const basicOrders = (basicData || []) as OrderWithDetails[];
          return {
            orders: await attachBestEffortOrderDetails(basicOrders),
            total: count || basicOrders.length,
          };
        }
        console.error("Error fetching all orders:", error);
        throw error;
      }

      const orders = ((data || []) as OrderJoinRow[]).map(mapJoinedOrder);

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
        if (isJoinOrPolicyError(error)) {
          const { data: basicData, error: basicError } = await supabase
            .from("orders")
            .select(ORDER_BASE_SELECT)
            .eq("id", orderId)
            .single();

          if (basicError) {
            throw basicError;
          }

          const [orderWithDetails] = await attachBestEffortOrderDetails([
            basicData as OrderWithDetails,
          ]);
          return orderWithDetails || null;
        }
        console.error("Error fetching order details:", error);
        throw error;
      }

      return mapJoinedOrder(data as OrderJoinRow);
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

  async getDashboardAnalytics(): Promise<DashboardOrderAnalytics> {
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const todayIso = startOfToday.toISOString();

      const [
        totalCountResult,
        todayOrdersResult,
        pendingCountResult,
        processingCountResult,
        recentOrdersResult,
      ] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("total").gte("created_at", todayIso),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "processing"),
        supabase
          .from("orders")
          .select(
            `
            id,
            user_id,
            status,
            total,
            shipping_address_id,
            created_at,
            updated_at,
            payment_method,
            payment_id,
            customer_name,
            customer_phone,
            customer_email,
            customer_note,
            profiles (
              username,
              email
            )
          `,
          )
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (
        totalCountResult.error ||
        todayOrdersResult.error ||
        pendingCountResult.error ||
        processingCountResult.error
      ) {
        const firstError =
          totalCountResult.error ||
          todayOrdersResult.error ||
          pendingCountResult.error ||
          processingCountResult.error;
        console.error("Error fetching orders for analytics:", firstError);
        throw firstError;
      }

      let recentOrderRows = (recentOrdersResult.data || []) as Array<
        Partial<OrderJoinRow> & {
          profiles?:
            | { username?: string | null; email?: string | null }
            | { username?: string | null; email?: string | null }[]
            | null;
        }
      >;
      if (recentOrdersResult.error) {
        if (!isJoinOrPolicyError(recentOrdersResult.error)) {
          console.error("Error fetching recent orders for analytics:", recentOrdersResult.error);
          throw recentOrdersResult.error;
        }

        const { data: basicRecentOrders, error: basicRecentOrdersError } = await supabase
          .from("orders")
          .select(ORDER_BASE_SELECT)
          .order("created_at", { ascending: false })
          .limit(10);

        if (basicRecentOrdersError) {
          console.error("Error fetching fallback recent orders:", basicRecentOrdersError);
          throw basicRecentOrdersError;
        }

        recentOrderRows = basicRecentOrders || [];
      }

      const totalOrders = totalCountResult.count || 0;
      const todayOrdersList = todayOrdersResult.data || [];
      const todayOrders = todayOrdersList.length;
      const todayRevenue = todayOrdersList.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0,
      );

      const ordersByStatus = {
        pending: pendingCountResult.count || 0,
        processing: processingCountResult.count || 0,
      };

      const recentOrders = recentOrderRows.map((order) => ({
        ...order,
        profile: (() => {
          const profile = normalizeOrderProfile(order.profiles);
          return profile
            ? {
                username: profile.username || "Unknown",
                email: profile.email || "Unknown",
              }
            : undefined;
        })(),
      })) as OrderWithDetails[];

      return {
        totalOrders,
        ordersByStatus,
        recentOrders,
        todayOrders,
        todayRevenue: Number(todayRevenue.toFixed(2)),
      };
    } catch (err) {
      console.error("Failed to get dashboard order analytics:", err);
      return {
        totalOrders: 0,
        ordersByStatus: {},
        recentOrders: [],
        todayOrders: 0,
        todayRevenue: 0,
      };
    }
  },

  async getOrderAnalytics(): Promise<OrderAnalytics> {
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const todayIso = startOfToday.toISOString();

      const [
        totalCountResult,
        totalRevenueResult,
        todayOrdersResult,
        statusRowsResult,
        recentOrdersResult,
        customerRowsResult,
      ] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("total"),
        supabase.from("orders").select("total").gte("created_at", todayIso),
        supabase.from("orders").select("status"),
        supabase
          .from("orders")
          .select(
            `
            id,
            user_id,
            status,
            total,
            shipping_address_id,
            created_at,
            updated_at,
            payment_method,
            payment_id,
            customer_name,
            customer_phone,
            customer_email,
            customer_note,
            profiles (
              username,
              email
            )
          `,
          )
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("orders")
          .select(
            `
            user_id,
            total,
            profiles (
              username,
              email
            )
          `,
          ),
      ]);

      if (
        totalCountResult.error ||
        totalRevenueResult.error ||
        todayOrdersResult.error ||
        statusRowsResult.error ||
        recentOrdersResult.error ||
        customerRowsResult.error
      ) {
        const firstError =
          totalCountResult.error ||
          totalRevenueResult.error ||
          todayOrdersResult.error ||
          statusRowsResult.error ||
          recentOrdersResult.error ||
          customerRowsResult.error;
        console.error("Error fetching orders for analytics:", firstError);
        throw firstError;
      }

      const totalOrders = totalCountResult.count || 0;
      const totalRevenue = (totalRevenueResult.data || []).reduce(
        (sum, order) => sum + Number(order.total || 0),
        0,
      );
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const todayOrdersList = todayOrdersResult.data || [];
      const todayOrders = todayOrdersList.length;
      const todayRevenue = todayOrdersList.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0,
      );

      const ordersByStatus = (statusRowsResult.data || []).reduce(
        (acc, order) => {
          const status = order.status || "unknown";
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const recentOrders = (recentOrdersResult.data || []).map((order) => ({
        ...order,
        profile: (() => {
          const profile = normalizeOrderProfile(order.profiles);
          return profile
            ? {
                username: profile.username || "Unknown",
                email: profile.email || "Unknown",
              }
            : undefined;
        })(),
      })) as OrderWithDetails[];

      const customerStats = (customerRowsResult.data || []).reduce<Record<string, CustomerStat>>(
        (acc, order) => {
          const userId = order.user_id || "guest";
          if (!acc[userId]) {
            const profile = normalizeOrderProfile(order.profiles);
            acc[userId] = {
              userId,
              username: profile?.username || "Unknown",
              email: profile?.email || "Unknown",
              totalOrders: 0,
              totalSpent: 0,
            };
          }
          acc[userId].totalOrders += 1;
          acc[userId].totalSpent += Number(order.total || 0);
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
        todayOrders,
        todayRevenue: Number(todayRevenue.toFixed(2)),
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
        todayOrders: 0,
        todayRevenue: 0,
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
      })) as unknown as OrderWithDetails[];
    } catch (err) {
      console.error("Failed to get orders requiring attention:", err);
      return [];
    }
  },
};


