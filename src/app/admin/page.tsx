"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Package,
  Settings,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";

import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { adminOrderService } from "@/services/admin/adminOrderService";
import { adminProductService } from "@/services/admin/adminProductService";
import { adminUserService } from "@/services/admin/adminUserService";
import { formatCurrency } from "@/utils/formatCurrency";
import { getSellableStock } from "@/utils/productVisibility";
import type { ProductType } from "@/types";

interface DashboardStats {
  products: {
    total: number;
    lowStock: number;
    totalValue: number;
  };
  orders: {
    total: number;
    revenue: number;
    averageValue: number;
    pending: number;
  };
  users: {
    total: number;
    active: number;
    admins: number;
    newThisMonth: number;
  };
}

const statCards = [
  { key: "revenue", label: "Doanh thu", icon: TrendingUp, tint: "brand" },
  { key: "products", label: "Sản phẩm", icon: Package, tint: "emerald" },
  { key: "orders", label: "Đơn chờ xử lý", icon: ShoppingCart, tint: "amber" },
  { key: "users", label: "Người dùng", icon: Users, tint: "sky" },
];

const tintStyles: Record<string, { card: string; icon: string; label: string; value: string; topBar: string }> = {
  brand: {
    card: "bg-gradient-to-br from-[#fef9f9] to-[#fdf4f4] border-[#f4d4d4]",
    icon: "bg-[#6e0f11] border-[#6e0f11] text-white",
    label: "text-[#6e0f11]",
    value: "text-[#6e0f11]",
    topBar: "bg-[#6e0f11] h-1 w-full absolute top-0 left-0",
  },
  emerald: {
    card: "bg-white border-zinc-200",
    icon: "bg-emerald-50 border-emerald-200 text-emerald-700",
    label: "text-zinc-500",
    value: "text-zinc-950",
    topBar: "bg-emerald-700 h-1 w-full absolute top-0 left-0",
  },
  amber: {
    card: "bg-white border-zinc-200",
    icon: "bg-amber-50 border-amber-200 text-amber-700",
    label: "text-zinc-500",
    value: "text-zinc-950",
    topBar: "bg-amber-500 h-1 w-full absolute top-0 left-0",
  },
  sky: {
    card: "bg-white border-zinc-200",
    icon: "bg-sky-50 border-sky-200 text-sky-700",
    label: "text-zinc-500",
    value: "text-zinc-950",
    topBar: "bg-sky-600 h-1 w-full absolute top-0 left-0",
  },
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading, error: adminError } = useAdmin();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Array<{ id: number; status: string; total: number; created_at?: string; profile?: { username: string; email: string } }>>([]);
  const [lowStockItems, setLowStockItems] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      router.push("/dashboard");
      return;
    }

    if (isAdmin) {
      fetchDashboardData();
    }
  }, [isAdmin, adminLoading, router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [productAnalytics, orderAnalytics, userAnalytics] =
        await Promise.all([
          adminProductService.getProductAnalytics(),
          adminOrderService.getOrderAnalytics(),
          adminUserService.getUserAnalytics(),
        ]);
      const allProducts = await adminProductService.getAllProducts();
      const lowStock = allProducts
        .filter((product) => getSellableStock(product) <= 5)
        .slice(0, 8);

      setStats({
        products: {
          total: productAnalytics.totalProducts,
          lowStock: productAnalytics.lowStockCount,
          totalValue: productAnalytics.totalInventoryValue,
        },
        orders: {
          total: orderAnalytics.totalOrders,
          revenue: orderAnalytics.totalRevenue,
          averageValue: orderAnalytics.averageOrderValue,
          pending: orderAnalytics.ordersByStatus.pending || 0,
        },
        users: {
          total: userAnalytics.totalUsers,
          active: userAnalytics.activeUsers,
          admins: userAnalytics.totalAdmins,
          newThisMonth: userAnalytics.newUsersThisMonth,
        },
      });
      setRecentOrders(orderAnalytics.recentOrders.slice(0, 8));
      setLowStockItems(lowStock);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (adminError || !isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 text-center">
        <h1 className="text-3xl font-black uppercase">Không có quyền truy cập</h1>
        <p className="mt-4 text-zinc-600">
          Tài khoản của bạn không có quyền admin.
        </p>
        <Link href="/dashboard">
          <Button className="mt-6 rounded-none bg-zinc-950 text-white hover:bg-zinc-800">
            Về trang người dùng
          </Button>
        </Link>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 text-center">
        <h1 className="text-2xl font-black uppercase">Không thể tải dashboard</h1>
        <p className="mt-3 text-zinc-600">Vui lòng thử lại sau.</p>
      </div>
    );
  }

  const statValues: Record<string, { value: string | number; helper: string }> = {
    revenue: {
      value: formatCurrency(stats.orders.revenue),
      helper: `${stats.orders.total} đơn hàng`,
    },
    products: {
      value: stats.products.total,
      helper: `${stats.products.lowStock} sản phẩm sắp hết hàng`,
    },
    orders: {
      value: stats.orders.pending,
      helper: "Cần xử lý",
    },
    users: {
      value: stats.users.total,
      helper: `${stats.users.active} đang hoạt động`,
    },
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
            RESEY Admin
          </p>
          <h1 className="mt-2 text-3xl font-black uppercase">Bảng điều khiển</h1>
          <p className="mt-1 text-zinc-500">Xin chào, {user?.email}</p>
        </div>
        <Badge className="w-fit rounded-none bg-zinc-950 text-white">
          <Settings className="mr-1 h-3 w-3" />
          Admin
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const data = statValues[card.key];
          const t = tintStyles[card.tint] ?? tintStyles.sky;
          return (
            <div
              key={card.key}
              className={`relative overflow-hidden rounded-none border p-5 shadow-[0_1px_2px_0_rgb(0_0_0_/_0.03)] ${t.card}`}
            >
              <div className={t.topBar} />
              <div className="mt-1 flex items-start justify-between gap-2">
                <p className={`text-[11px] font-bold uppercase tracking-[0.14em] leading-snug flex-1 ${t.label}`}>
                  {card.label}
                </p>
                <span className={`inline-flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center border ${t.icon}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className={`mt-4 text-[26px] font-black tracking-tight tabular-nums ${t.value}`}>
                {data.value}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{data.helper}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Link href="/admin/products">
          <Button variant="outline" className="h-14 w-full rounded-none">
            <Package className="mr-2 h-4 w-4" />
            Quản lý sản phẩm
          </Button>
        </Link>
        <Link href="/admin/orders">
          <Button variant="outline" className="h-14 w-full rounded-none">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Quản lý đơn hàng
          </Button>
        </Link>
        <Link href="/admin/users">
          <Button variant="outline" className="h-14 w-full rounded-none">
            <Users className="mr-2 h-4 w-4" />
            Quản lý người dùng
          </Button>
        </Link>
        <Link href="/admin/settings">
          <Button variant="outline" className="h-14 w-full rounded-none">
            <Settings className="mr-2 h-4 w-4" />
            Cấu hình cửa hàng
          </Button>
        </Link>
      </div>

      <section className="border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-[0.16em]">Quick actions</h2>
          <Link href="/admin/settings" className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500 hover:text-zinc-900">
            Cấu hình
          </Link>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <Link href="/admin/products" className="flex items-center justify-between border border-zinc-200 px-4 py-3 text-sm font-medium hover:bg-zinc-50">
            Thêm / sửa sản phẩm <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/admin/orders" className="flex items-center justify-between border border-zinc-200 px-4 py-3 text-sm font-medium hover:bg-zinc-50">
            Xử lý đơn hàng <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/admin/users" className="flex items-center justify-between border border-zinc-200 px-4 py-3 text-sm font-medium hover:bg-zinc-50">
            Quản lý người dùng <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="border border-zinc-200 p-5">
          <h2 className="flex items-center text-lg font-black uppercase">
            <TrendingUp className="mr-2 h-5 w-5" />
            Chỉ số chính
          </h2>
          <div className="mt-5 space-y-4">
            <div className="flex justify-between">
              <span className="text-sm text-zinc-500">Giá trị đơn trung bình</span>
              <span className="font-bold">
                {formatCurrency(stats.orders.averageValue)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-zinc-500">Giá trị tồn kho</span>
              <span className="font-bold">
                {formatCurrency(stats.products.totalValue)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-zinc-500">Người dùng mới tháng này</span>
              <span className="font-bold">{stats.users.newThisMonth}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-zinc-500">Tài khoản admin</span>
              <span className="font-bold">{stats.users.admins}</span>
            </div>
          </div>
        </section>

        <section className="border border-zinc-200 p-5">
          <h2 className="flex items-center text-lg font-black uppercase">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Cảnh báo
          </h2>
          <div className="mt-5 space-y-3">
            {stats.products.lowStock > 0 && (
              <div className="border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-sm font-bold text-yellow-800">
                  {stats.products.lowStock} sản phẩm sắp hết hàng
                </p>
              </div>
            )}
            {stats.orders.pending > 0 && (
              <div className="border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-bold text-blue-800">
                  {stats.orders.pending} đơn hàng đang chờ xử lý
                </p>
              </div>
            )}
            {stats.products.lowStock === 0 && stats.orders.pending === 0 && (
              <div className="border border-green-200 bg-green-50 p-4">
                <p className="flex items-center text-sm font-bold text-green-800">
                  <Activity className="mr-2 h-4 w-4" />
                  Không có cảnh báo cần xử lý ngay
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="border border-zinc-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-[0.16em]">Đơn hàng gần đây</h2>
            <Link href="/admin/orders" className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500 hover:text-zinc-900">
              Xem tất cả
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                <tr>
                  <th className="pb-2 text-left">Mã đơn</th>
                  <th className="pb-2 text-left">Khách</th>
                  <th className="pb-2 text-left">Trạng thái</th>
                  <th className="pb-2 text-right">Tổng</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-3 text-zinc-500">Không có dữ liệu</td>
                  </tr>
                )}
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-t border-zinc-100">
                    <td className="py-2 font-semibold">#{order.id}</td>
                    <td className="py-2">{order.profile?.username || order.profile?.email || "Khách lẻ"}</td>
                    <td className="py-2">{order.status}</td>
                    <td className="py-2 text-right font-semibold">{formatCurrency(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border border-zinc-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-[0.16em]">Sản phẩm sắp hết</h2>
            <Link href="/admin/products?status=hidden-web" className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500 hover:text-zinc-900">
              Kiểm tra web
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-zinc-500">
                <tr>
                  <th className="pb-2 text-left">Sản phẩm</th>
                  <th className="pb-2 text-right">Tồn kho</th>
                </tr>
              </thead>
              <tbody>
                {lowStockItems.length === 0 && (
                  <tr>
                    <td colSpan={2} className="py-3 text-zinc-500">Không có dữ liệu</td>
                  </tr>
                )}
                {lowStockItems.map((product) => (
                  <tr key={product.product_id} className="border-t border-zinc-100">
                    <td className="py-2">{product.title}</td>
                    <td className="py-2 text-right font-semibold">{getSellableStock(product)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
