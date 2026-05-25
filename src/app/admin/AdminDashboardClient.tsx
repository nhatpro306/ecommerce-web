"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  ImageOff,
  Inbox,
  PackageOpen,
  PackagePlus,
  PackageSearch,
  Plus,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Tag,
  TriangleAlert,
} from "lucide-react";

import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { adminOrderService } from "@/services/admin/adminOrderService";
import { adminProductService, ProductWithDetails } from "@/services/admin/adminProductService";
import { formatCurrency } from "@/utils/formatCurrency";
import { getSellableStock, isPubliclyVisibleProduct } from "@/utils/productVisibility";
import { getProductImage } from "@/utils/productImages";
import { useAdminSession } from "./AdminSessionContext";

type RecentOrder = {
  id: number;
  status: string;
  total: number;
  created_at?: string;
  payment_method?: string;
  customer_name?: string;
  customer_phone?: string;
  profile?: { username?: string; email?: string };
};

type DashboardData = {
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
  activeProducts: number;
  lowStockProducts: number;
  brokenProducts: number;
  totalOrders: number;
  totalRevenue: number;
  recentOrders: RecentOrder[];
  attentionProducts: ProductWithDetails[];
  recentlyUpdatedProducts: ProductWithDetails[];
};

type ProductIssue = {
  label: string;
  tone: "warning" | "danger" | "info";
};

function detectProductIssues(product: ProductWithDetails): ProductIssue[] {
  const issues: ProductIssue[] = [];

  const title = (product.title || "").toLowerCase();
  const slug = (product.slug || "").toLowerCase();
  const looksLikeTest = title.includes("test") || slug.includes("test");

  if (looksLikeTest) {
    issues.push({ label: "Sản phẩm test", tone: "danger" });
  }

  const hasImage = Boolean(product.image || product.images?.[0]?.url);
  if (!hasImage) issues.push({ label: "Thiếu ảnh", tone: "danger" });

  const hasCategory = product.category_id !== null && product.category_id !== undefined;
  if (!hasCategory) issues.push({ label: "Chưa phân loại", tone: "warning" });

  const stock = getSellableStock(product);
  if (stock <= 0) {
    issues.push({ label: "Hết hàng", tone: "danger" });
  } else if (stock <= 5) {
    issues.push({ label: "Sắp hết hàng", tone: "warning" });
  }

  if (product.is_active === false) {
    issues.push({ label: "Đang ẩn", tone: "info" });
  }

  return issues;
}

function statusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Mới";
    case "processing":
      return "Đang xử lý";
    case "shipped":
      return "Đang giao";
    case "delivered":
      return "Hoàn tất";
    case "cancelled":
      return "Đã huỷ";
    default:
      return status;
  }
}

function paymentLabel(method?: string) {
  if (!method) return "Không rõ";
  if (method === "cod") return "COD";
  if (method === "bank_transfer") return "Chuyển khoản";
  return method;
}

function statusTone(status: string) {
  switch (status) {
    case "pending":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "processing":
      return "bg-blue-50 text-blue-800 border-blue-200";
    case "shipped":
      return "bg-sky-50 text-sky-800 border-sky-200";
    case "delivered":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "cancelled":
      return "bg-rose-50 text-rose-800 border-rose-200";
    default:
      return "bg-zinc-50 text-zinc-800 border-zinc-200";
  }
}

function issueTone(tone: ProductIssue["tone"]) {
  switch (tone) {
    case "danger":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "warning":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-zinc-50 text-zinc-700 border-zinc-200";
  }
}

const KPI_TINTS = {
  brand: {
    card: "bg-gradient-to-br from-[#fef9f9] to-[#fdf4f4] border-[#f4d4d4]",
    icon: "bg-[#6e0f11] text-white border-[#6e0f11]",
    label: "text-[#6e0f11]",
    value: "text-[#6e0f11]",
  },
  neutral: {
    card: "bg-white border-zinc-200",
    icon: "bg-zinc-100 text-zinc-700 border-zinc-200",
    label: "text-zinc-500",
    value: "text-zinc-950",
  },
  amber: {
    card: "bg-white border-zinc-200",
    icon: "bg-amber-50 text-amber-700 border-amber-200",
    label: "text-zinc-500",
    value: "text-zinc-950",
  },
  emerald: {
    card: "bg-white border-zinc-200",
    icon: "bg-emerald-50 text-emerald-700 border-emerald-200",
    label: "text-zinc-500",
    value: "text-zinc-950",
  },
  sky: {
    card: "bg-white border-zinc-200",
    icon: "bg-sky-50 text-sky-700 border-sky-200",
    label: "text-zinc-500",
    value: "text-zinc-950",
  },
  rose: {
    card: "bg-white border-zinc-200",
    icon: "bg-rose-50 text-rose-700 border-rose-200",
    label: "text-zinc-500",
    value: "text-zinc-950",
  },
} as const;

type TintKey = keyof typeof KPI_TINTS;

type KpiDef = {
  key: string;
  label: string;
  description: string;
  icon: typeof PackageOpen;
  tint: TintKey;
  href?: string;
  formatter: (data: DashboardData) => string | number;
  helper: (data: DashboardData) => string;
};

const KPI_CARDS: KpiDef[] = [
  {
    key: "todayOrders",
    label: "Đơn mới hôm nay",
    description: "Tính từ 00:00 hôm nay",
    icon: ShoppingBag,
    tint: "brand",
    href: "/admin/orders",
    formatter: (data) => data.todayOrders,
    helper: (data) =>
      data.todayOrders > 0
        ? `Cần kiểm tra ${data.todayOrders} đơn mới`
        : "Chưa có đơn hàng mới",
  },
  {
    key: "todayRevenue",
    label: "Doanh thu hôm nay",
    description: "Tổng giá trị đơn đã tạo hôm nay",
    icon: CircleDollarSign,
    tint: "emerald",
    href: "/admin/orders",
    formatter: (data) => formatCurrency(data.todayRevenue),
    helper: (data) =>
      data.todayRevenue > 0
        ? `Tổng cộng ${data.todayOrders} đơn`
        : "Chưa phát sinh doanh thu",
  },
  {
    key: "pending",
    label: "Đơn chờ xử lý",
    description: "Đơn ở trạng thái Mới hoặc Đang xử lý",
    icon: Inbox,
    tint: "amber",
    href: "/admin/orders?status=pending",
    formatter: (data) => data.pendingOrders,
    helper: (data) =>
      data.pendingOrders > 0
        ? "Cần xác nhận sớm"
        : "Mọi đơn đã được xử lý",
  },
  {
    key: "activeProducts",
    label: "Sản phẩm đang bán",
    description: "Sản phẩm đủ điều kiện hiển thị công khai",
    icon: PackageOpen,
    tint: "sky",
    href: "/admin/products",
    formatter: (data) => data.activeProducts,
    helper: (data) => `${data.activeProducts} sản phẩm hiển thị trên web`,
  },
  {
    key: "lowStock",
    label: "Sản phẩm sắp hết hàng",
    description: "Tồn kho còn ≤ 5",
    icon: Tag,
    tint: "amber",
    href: "/admin/products?lowStock=1",
    formatter: (data) => data.lowStockProducts,
    helper: (data) =>
      data.lowStockProducts > 0
        ? "Nên nhập thêm hàng"
        : "Tồn kho ổn",
  },
  {
    key: "broken",
    label: "Sản phẩm lỗi dữ liệu",
    description: "Thiếu ảnh, chưa phân loại, sản phẩm test hoặc hết hàng",
    icon: TriangleAlert,
    tint: "rose",
    href: "/admin/products?status=hidden-web",
    formatter: (data) => data.brokenProducts,
    helper: (data) =>
      data.brokenProducts > 0
        ? "Bị ẩn khỏi storefront — cần sửa"
        : "Không có sản phẩm lỗi",
  },
];

export default function AdminDashboardClient() {
  const { adminEmail } = useAdminSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      try {
        setLoading(true);
        setLoadError(null);

        const [orderAnalytics, allProducts] = await Promise.all([
          adminOrderService.getOrderAnalytics(),
          adminProductService.getAllProducts({ includeReviews: false, limit: 50 }),
        ]);

        if (cancelled) return;

        const lowStockProducts = allProducts.filter((product) => {
          const stock = getSellableStock(product);
          return stock > 0 && stock <= 5;
        });
        const activeProducts = allProducts.filter((product) =>
          isPubliclyVisibleProduct(product),
        );
        const brokenProducts = allProducts.filter(
          (product) => !isPubliclyVisibleProduct(product),
        );

        const attentionProducts = [...brokenProducts, ...lowStockProducts]
          .filter(
            (product, index, list) =>
              list.findIndex((p) => p.product_id === product.product_id) === index,
          )
          .slice(0, 8);

        const recentlyUpdatedProducts = [...allProducts]
          .sort((a, b) => {
            const aDate = new Date(a.updated_at || a.created_at || 0).getTime();
            const bDate = new Date(b.updated_at || b.created_at || 0).getTime();
            return bDate - aDate;
          })
          .slice(0, 5);

        setData({
          todayOrders: orderAnalytics.todayOrders,
          todayRevenue: orderAnalytics.todayRevenue,
          pendingOrders:
            (orderAnalytics.ordersByStatus.pending || 0) +
            (orderAnalytics.ordersByStatus.processing || 0),
          activeProducts: activeProducts.length,
          lowStockProducts: lowStockProducts.length,
          brokenProducts: brokenProducts.length,
          totalOrders: orderAnalytics.totalOrders,
          totalRevenue: orderAnalytics.totalRevenue,
          recentOrders: orderAnalytics.recentOrders.slice(0, 6) as RecentOrder[],
          attentionProducts,
          recentlyUpdatedProducts,
        });
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        if (!cancelled) {
          setLoadError("Không thể tải dữ liệu bảng điều khiển.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();

    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = adminEmail ? adminEmail.split("@")[0] : "Admin RESEY";

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 text-center">
        <h1 className="text-2xl font-black uppercase">Không thể tải dashboard</h1>
        <p className="mt-3 text-zinc-600">{loadError || "Vui lòng thử lại sau."}</p>
        <Button
          className="mt-6 rounded-none bg-zinc-950 text-white hover:bg-zinc-800"
          onClick={() => window.location.reload()}
        >
          Tải lại
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6">
      {/* Page header */}
      <header className="flex flex-col gap-4 border border-zinc-200 bg-white p-5 md:flex-row md:items-end md:justify-between md:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">
            RESEY Admin
          </p>
          <h1 className="mt-2 text-2xl font-black uppercase tracking-tight md:text-3xl">
            Tổng quan cửa hàng
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Theo dõi đơn hàng, sản phẩm và trạng thái cửa hàng — xin chào, {displayName}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/products/new">
            <Button className="h-11 rounded-none bg-zinc-950 px-4 text-xs font-bold uppercase tracking-[0.14em] text-white hover:bg-zinc-800">
              <Plus className="mr-2 h-4 w-4" />
              Thêm sản phẩm
            </Button>
          </Link>
          <Link href="/admin/orders?status=pending">
            <Button
              variant="outline"
              className="h-11 rounded-none border-zinc-300 px-4 text-xs font-bold uppercase tracking-[0.14em]"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Xem đơn mới
            </Button>
          </Link>
          <Link href="/admin/settings">
            <Button
              variant="outline"
              className="h-11 rounded-none border-zinc-300 px-4 text-xs font-bold uppercase tracking-[0.14em]"
            >
              <Settings className="mr-2 h-4 w-4" />
              Cài đặt shop
            </Button>
          </Link>
        </div>
      </header>

      {/* KPI cards */}
      <section
        aria-label="Chỉ số chính"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        {KPI_CARDS.map((card) => {
          const Icon = card.icon;
          const tint = KPI_TINTS[card.tint];
          const value = card.formatter(data);
          const helper = card.helper(data);

          const Body = (
            <div
              className={`relative h-full overflow-hidden border p-4 shadow-[0_1px_2px_0_rgb(0_0_0_/_0.03)] transition ${tint.card} ${
                card.href ? "hover:-translate-y-[1px] hover:shadow-md" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p
                  className={`flex-1 text-[11px] font-bold uppercase leading-snug tracking-[0.12em] ${tint.label}`}
                >
                  {card.label}
                </p>
                <span
                  className={`inline-flex h-9 w-9 flex-shrink-0 items-center justify-center border ${tint.icon}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p
                className={`mt-4 text-[22px] font-black tracking-tight tabular-nums ${tint.value}`}
              >
                {value}
              </p>
              <p className="mt-1 text-xs text-zinc-500">{helper}</p>
            </div>
          );

          return card.href ? (
            <Link key={card.key} href={card.href} className="block h-full">
              {Body}
            </Link>
          ) : (
            <div key={card.key} className="h-full">
              {Body}
            </div>
          );
        })}
      </section>

      {/* Đơn cần xử lý + Sản phẩm cần chú ý */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="border border-zinc-200 bg-white p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.16em]">
                Đơn cần xử lý
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                {data.pendingOrders} đơn đang chờ — {data.totalOrders} đơn tổng cộng
              </p>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500 hover:text-zinc-900"
            >
              Xem tất cả →
            </Link>
          </div>

          {data.recentOrders.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Chưa có đơn hàng cần xử lý."
              body="Khi khách đặt hàng, đơn mới sẽ xuất hiện ở đây."
            />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {data.recentOrders.map((order) => {
                const customer =
                  order.customer_name ||
                  order.profile?.username ||
                  order.profile?.email ||
                  "Khách lẻ";
                const phone = order.customer_phone || "—";
                return (
                  <li
                    key={order.id}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold tabular-nums">#{order.id}</span>
                        <span
                          className={`inline-flex items-center border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${statusTone(order.status)}`}
                        >
                          {statusLabel(order.status)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-zinc-700">{customer}</p>
                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {phone} · {paymentLabel(order.payment_method)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                      <span className="text-sm font-bold tabular-nums">
                        {formatCurrency(order.total)}
                      </span>
                      <Link
                        href={`/admin/orders?order=${order.id}`}
                        className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-700 underline-offset-4 hover:text-zinc-950 hover:underline"
                      >
                        Xem đơn
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border border-zinc-200 bg-white p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.16em]">
                Sản phẩm cần chú ý
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                {data.brokenProducts + data.lowStockProducts} sản phẩm cần kiểm tra
              </p>
            </div>
            <Link
              href="/admin/products"
              className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500 hover:text-zinc-900"
            >
              Xem tất cả →
            </Link>
          </div>

          {data.attentionProducts.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Tất cả sản phẩm đang ổn."
              body="Không có sản phẩm thiếu ảnh, sai phân loại hoặc sắp hết hàng."
              tone="success"
            />
          ) : (
            <ul className="space-y-3">
              {data.attentionProducts.map((product) => {
                const issues = detectProductIssues(product);
                const image = product.images?.[0]?.url || getProductImage(product);
                return (
                  <li
                    key={product.product_id}
                    className="flex gap-3 border border-zinc-200 bg-white p-3"
                  >
                    <div className="h-14 w-14 flex-shrink-0 overflow-hidden border border-zinc-200 bg-zinc-100">
                      {image ? (
                        <Image
                          src={image}
                          alt={product.title}
                          width={56}
                          height={56}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-zinc-400">
                          <ImageOff className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-900">
                        {product.title}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {issues.map((issue) => (
                          <span
                            key={issue.label}
                            className={`inline-flex items-center border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${issueTone(issue.tone)}`}
                          >
                            {issue.label}
                          </span>
                        ))}
                      </div>
                      <Link
                        href={`/admin/products?edit=${product.product_id}`}
                        className="mt-2 inline-flex items-center text-xs font-bold uppercase tracking-[0.12em] text-zinc-700 underline-offset-4 hover:text-zinc-950 hover:underline"
                      >
                        Sửa sản phẩm <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Quick actions */}
      <section className="border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-[0.16em]">
            Thao tác nhanh
          </h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionLink
            href="/admin/products/new"
            icon={PackagePlus}
            label="Thêm sản phẩm mới"
          />
          <QuickActionLink
            href="/admin/products"
            icon={PackageSearch}
            label="Quản lý sản phẩm"
          />
          <QuickActionLink
            href="/admin/orders"
            icon={ShoppingCart}
            label="Quản lý đơn hàng"
          />
          <QuickActionLink
            href="/admin/settings"
            icon={Settings}
            label="Chỉnh thông tin shop"
          />
          <QuickActionLink
            href="/admin/settings#shipping"
            icon={Tag}
            label="Chỉnh phí vận chuyển"
          />
          <QuickActionLink
            href="/admin/settings#contact"
            icon={Sparkles}
            label="Liên hệ / Zalo / IG / TikTok"
          />
        </div>
      </section>

      {/* Recent activity */}
      <section className="border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-[0.16em]">
            Hoạt động gần đây
          </h2>
          <Link
            href="/admin/products"
            className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-500 hover:text-zinc-900"
          >
            Tất cả sản phẩm →
          </Link>
        </div>
        {data.recentlyUpdatedProducts.length === 0 ? (
          <EmptyState
            icon={PackageOpen}
            title="Chưa có hoạt động nào."
            body="Khi bạn thêm hoặc sửa sản phẩm, nhật ký sẽ hiện ở đây."
          />
        ) : (
          <ul className="divide-y divide-zinc-100">
            {data.recentlyUpdatedProducts.map((product) => {
              const updated = product.updated_at || product.created_at;
              return (
                <li
                  key={product.product_id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {product.title}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {updated ? new Date(updated).toLocaleString("vi-VN") : "—"}
                    </p>
                  </div>
                  <Link
                    href={`/admin/products?edit=${product.product_id}`}
                    className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-700 underline-offset-4 hover:text-zinc-950 hover:underline"
                  >
                    Sửa
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function QuickActionLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Plus;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50"
    >
      <span className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-zinc-500 group-hover:text-zinc-900" />
        {label}
      </span>
      <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-zinc-900" />
    </Link>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
  tone = "default",
}: {
  icon: typeof Plus;
  title: string;
  body: string;
  tone?: "default" | "success";
}) {
  const accent =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-zinc-50 text-zinc-500 border-zinc-200";
  return (
    <div className={`flex flex-col items-center gap-2 border border-dashed py-8 text-center ${accent}`}>
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white">
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-sm font-semibold">{title}</p>
      <p className="max-w-xs text-xs">{body}</p>
    </div>
  );
}
