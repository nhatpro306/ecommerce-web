"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProducts, useOrders } from "@/hooks/queries";
import Link from "next/link";
import { OrderCard } from "@/components/OrderCard";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { ErrorState } from "@/components/ErrorState";
import Image from "next/image";
import { formatCurrency } from "@/utils/formatCurrency";

export default function DashboardPage() {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "analytics" | "products" | "orders"
  >("analytics");

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      router.replace("/admin");
    }
  }, [adminLoading, isAdmin, router]);

  // Use query hooks instead of manual state management
  const {
    data: products,
    isLoading: productsLoading,
    error: productsError,
    refetch: refetchProducts,
  } = useProducts();
  const { data: orders, isLoading: ordersLoading } = useOrders(user?.id || "");

  if (!user) {
    return (
      <div className="container mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle>Vui lòng đăng nhập</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Bạn cần đăng nhập để xem trang tổng quan.
            </p>
            <Link href="/signin">
              <Button>Đăng nhập</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Tổng quan</h1>

        <div className="flex border-b">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`hover:text-primary cursor-pointer px-4 py-2 font-medium transition-colors ${
              activeTab === "analytics"
                ? "border-primary text-primary border-b-2"
                : "text-muted-foreground"
            }`}
          >
            Thống kê
          </button>
          <button
            onClick={() => setActiveTab("products")}
            className={`hover:text-primary cursor-pointer px-4 py-2 font-medium transition-colors ${
              activeTab === "products"
                ? "border-primary text-primary border-b-2"
                : "text-muted-foreground"
            }`}
          >
            Sản phẩm
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`hover:text-primary cursor-pointer px-4 py-2 font-medium transition-colors ${
              activeTab === "orders"
                ? "border-primary text-primary border-b-2"
                : "text-muted-foreground"
            }`}
          >
            Lịch sử đơn hàng
          </button>
        </div>

        {activeTab === "analytics" &&
          (ordersLoading ? (
            <div className="flex h-64 items-center justify-center">
              <p>Đang tải...</p>
            </div>
          ) : (
            <DashboardCharts orders={orders || []} />
          ))}

        {activeTab === "products" &&
          (productsLoading ? (
            <div className="flex h-64 items-center justify-center">
              <p>Đang tải...</p>
            </div>
          ) : productsError ? (
            <ErrorState
              title="Không thể tải sản phẩm"
              description="Không thể tải danh sách sản phẩm. Vui lòng kiểm tra kết nối."
              onRetry={refetchProducts}
              error={productsError}
              type="network"
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {products && products.length > 0 ? (
                products.map((product) => (
                  <Card key={product.product_id} className="overflow-hidden">
                    <div className="h-48 bg-gray-100">
                      {product.image ? (
                        <Image
                          src={product.image || ""}
                          alt={product.title}
                          width={400}
                          height={192}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-muted-foreground flex h-full w-full items-center justify-center">
                          Chưa có ảnh
                        </div>
                      )}
                    </div>
                    <CardHeader>
                      <CardTitle className="line-clamp-1">
                        {product.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-muted-foreground mb-2 line-clamp-2 text-sm">
                        {product.description}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {formatCurrency(product.price)}
                        </span>
                        <Link href={`/products/${product.slug || product.product_id}`}>
                          <Button size="sm">Xem chi tiết</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full flex h-64 items-center justify-center">
                  <p className="text-muted-foreground">Chưa có sản phẩm</p>
                </div>
              )}
            </div>
          ))}

        {activeTab === "orders" &&
          (ordersLoading ? (
            <div className="flex h-64 items-center justify-center">
              <p>Đang tải...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {orders && orders.length > 0 ? (
                orders.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center px-4 py-12">
                  <p className="mb-4 text-xl font-medium">Chưa có đơn hàng</p>
                  <p className="text-muted-foreground mb-6">
                    Bạn chưa có đơn hàng nào.
                  </p>
                  <Link href="/">
                    <Button>Xem sản phẩm</Button>
                  </Link>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
