"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Package,
  Settings,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/context/AuthContext";
import { adminProductService } from "@/services/admin/adminProductService";
import { adminOrderService } from "@/services/admin/adminOrderService";
import { adminUserService } from "@/services/admin/adminUserService";
import { formatCurrency } from "@/utils/formatCurrency";

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
  {
    key: "revenue",
    label: "Doanh thu",
    icon: TrendingUp,
  },
  {
    key: "products",
    label: "Sản phẩm",
    icon: Package,
  },
  {
    key: "orders",
    label: "Đơn hàng chờ",
    icon: ShoppingCart,
  },
  {
    key: "users",
    label: "Người dùng",
    icon: Users,
  },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading, error: adminError } = useAdmin();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
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
            RESEY ADMIN
          </p>
          <h1 className="mt-2 text-3xl font-black uppercase">
            Bảng điều khiển
          </h1>
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
          return (
            <div key={card.key} className="border border-zinc-200 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                  {card.label}
                </p>
                <Icon className="h-5 w-5 text-zinc-400" />
              </div>
              <p className="mt-4 text-2xl font-black">{data.value}</p>
              <p className="mt-1 text-sm text-zinc-500">{data.helper}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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
      </div>

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
    </div>
  );
}
