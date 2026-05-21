"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Calendar, Eye, Filter, Package, Search, User } from "lucide-react";
import { toast } from "sonner";

import { OrderDetailsModal } from "@/components/admin/OrderDetailsModal";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminOrderService,
  OrderFilters,
  OrderWithDetails,
} from "@/services/admin/adminOrderService";
import { formatCurrency } from "@/utils/formatCurrency";

import { updateAdminOrderStatusAction } from "./actions";

const statusOptions = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "pending", label: "Chờ xác nhận" },
  { value: "processing", label: "Đang đóng gói" },
  { value: "shipped", label: "Đang giao" },
  { value: "delivered", label: "Hoàn thành" },
  { value: "cancelled", label: "Đã hủy" },
];

const paymentLabels: Record<string, string> = {
  cod: "COD",
  bank_transfer: "Chuyển khoản",
  stripe: "Stripe",
};

const mapStatusLabel = (status: string) => {
  switch (status) {
    case "processing":
      return "Đang đóng gói";
    case "shipped":
      return "Đang giao";
    case "delivered":
      return "Hoàn thành";
    case "cancelled":
      return "Đã hủy";
    default:
      return "Chờ xác nhận";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "delivered":
      return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
    case "shipped":
      return "bg-sky-100 text-sky-800 hover:bg-sky-100";
    case "processing":
      return "bg-blue-100 text-blue-800 hover:bg-blue-100";
    case "pending":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
    case "cancelled":
      return "bg-red-100 text-red-800 hover:bg-red-100";
    default:
      return "bg-zinc-100 text-zinc-800 hover:bg-zinc-100";
  }
};

function getPaymentStatusLabel(order: OrderWithDetails) {
  if (order.payment_method === "bank_transfer") return "Đang kiểm tra";
  if (order.payment_method === "cod") return "Chưa thanh toán";
  return "Chưa thanh toán";
}

function getProductSummary(order: OrderWithDetails) {
  const items = order.order_items || [];
  if (items.length === 0) return "Chưa có sản phẩm";

  const firstItem = items[0];
  const firstTitle =
    firstItem.product_title_snapshot || firstItem.product?.title || "Sản phẩm";
  const variantText = [
    firstItem.color_snapshot || firstItem.selected_color,
    firstItem.size_snapshot || firstItem.selected_size,
    firstItem.sku_snapshot,
  ]
    .filter(Boolean)
    .join(" / ");

  return `${firstTitle}${variantText ? ` (${variantText})` : ""}${
    items.length > 1 ? ` +${items.length - 1} sản phẩm` : ""
  }`;
}

function getCustomerName(order: OrderWithDetails) {
  return order.customer_name || order.profile?.username || "Khách hàng";
}

function getCustomerContact(order: OrderWithDetails) {
  return order.customer_phone || order.customer_email || order.profile?.email || "Chưa có liên hệ";
}

function getAddressText(order: OrderWithDetails) {
  if (!order.shipping_address) return "Chưa có địa chỉ";
  return [
    order.shipping_address.street,
    order.shipping_address.city,
    order.shipping_address.state,
    order.shipping_address.zip_code,
    order.shipping_address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<OrderFilters>({});
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(
    null,
  );
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const pageLimit = 20;

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminOrderService.getAllOrders(
        filters,
        currentPage,
        pageLimit,
      );
      setOrders(data.orders);
      setTotalOrders(data.total);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Không thể tải đơn hàng");
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      await updateAdminOrderStatusAction(orderId, newStatus);
      toast.success("Đã cập nhật trạng thái đơn hàng");
      fetchOrders();
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Không thể cập nhật trạng thái");
    }
  };

  const handleFilterChange = (key: keyof OrderFilters, value: string) => {
    setFilters((previous) => ({
      ...previous,
      [key]: value || undefined,
    }));
    setCurrentPage(1);
  };

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return orders;

    return orders.filter((order) => {
      const searchText = [
        order.id,
        getCustomerName(order),
        getCustomerContact(order),
        getAddressText(order),
        order.payment_method,
      ]
        .join(" ")
        .toLowerCase();

      return searchText.includes(normalizedSearch);
    });
  }, [orders, searchTerm]);

  const totalPages = Math.ceil(totalOrders / pageLimit);
  const pendingCount = orders.filter((order) => order.status === "pending").length;
  const shippingCount = orders.filter((order) => order.status === "shipped").length;
  const pageRevenue = orders.reduce((total, order) => total + order.total, 0);

  if (loading && orders.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
            RESEY Admin
          </p>
          <h1 className="mt-2 text-3xl font-black uppercase">
            Quản lý đơn hàng
          </h1>
          <p className="mt-1 text-zinc-500">
            Theo dõi khách hàng, thanh toán, địa chỉ và trạng thái xử lý.
          </p>
        </div>
        <span className="text-sm font-bold uppercase tracking-[0.14em] text-zinc-500">
          {totalOrders} đơn hàng
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border border-zinc-200 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Trang hiện tại</p>
          <p className="mt-2 text-2xl font-black">{orders.length}</p>
        </div>
        <div className="border border-zinc-200 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Chờ xác nhận</p>
          <p className="mt-2 text-2xl font-black">{pendingCount}</p>
        </div>
        <div className="border border-zinc-200 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Đang giao</p>
          <p className="mt-2 text-2xl font-black">{shippingCount}</p>
        </div>
        <div className="border border-zinc-200 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Doanh thu trang</p>
          <p className="mt-2 text-2xl font-black">{formatCurrency(pageRevenue)}</p>
        </div>
      </div>

      <div className="grid gap-3 border border-zinc-200 p-4 lg:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Tìm theo mã đơn, tên, số điện thoại, email, địa chỉ..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="rounded-none border-zinc-300 pl-9"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-400" />
            <Select
              value={filters.status || "all"}
              onValueChange={(value) => {
                handleFilterChange("status", value === "all" ? "" : value || "");
              }}
            >
              <SelectTrigger className="w-full rounded-none sm:w-44">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            type="date"
            value={filters.dateFrom || ""}
            onChange={(event) => handleFilterChange("dateFrom", event.target.value)}
            className="rounded-none border-zinc-300 sm:w-40"
          />
          <Input
            type="date"
            value={filters.dateTo || ""}
            onChange={(event) => handleFilterChange("dateTo", event.target.value)}
            className="rounded-none border-zinc-300 sm:w-40"
          />
        </div>
      </div>

      <div className="overflow-hidden border border-zinc-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="border-b bg-zinc-50 text-xs uppercase tracking-[0.14em] text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-bold">Đơn hàng</th>
                <th className="px-4 py-3 font-bold">Khách hàng</th>
                <th className="px-4 py-3 font-bold">Sản phẩm</th>
                <th className="px-4 py-3 font-bold">Địa chỉ</th>
                <th className="px-4 py-3 font-bold">Thanh toán</th>
                <th className="px-4 py-3 font-bold">TT thanh toán</th>
                <th className="px-4 py-3 font-bold">Tổng tiền</th>
                <th className="px-4 py-3 font-bold">Trạng thái</th>
                <th className="px-4 py-3 text-right font-bold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="bg-white hover:bg-zinc-50">
                  <td className="px-4 py-4">
                    <p className="font-black">#{order.id}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                      <Calendar className="h-3 w-3" />
                      {order.created_at
                        ? format(new Date(order.created_at), "dd/MM/yyyy HH:mm")
                        : "Chưa có ngày"}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="flex items-center gap-1 font-bold">
                      <User className="h-3 w-3" />
                      {getCustomerName(order)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">{getCustomerContact(order)}</p>
                  </td>
                  <td className="max-w-[260px] px-4 py-4 text-zinc-700">
                    <p className="line-clamp-2 font-semibold">{getProductSummary(order)}</p>
                  </td>
                  <td className="max-w-[260px] px-4 py-4 text-zinc-600">
                    <p className="line-clamp-2">{getAddressText(order)}</p>
                  </td>
                  <td className="px-4 py-4 text-zinc-600">
                    {paymentLabels[order.payment_method || ""] || order.payment_method || "Chưa chọn"}
                  </td>
                  <td className="px-4 py-4 text-zinc-600">
                    {getPaymentStatusLabel(order)}
                  </td>
                  <td className="px-4 py-4 font-black">
                    {formatCurrency(order.total)}
                  </td>
                  <td className="px-4 py-4">
                    <Badge className={`rounded-none ${getStatusColor(order.status)}`}>
                      {mapStatusLabel(order.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <Select
                        value={order.status}
                        onValueChange={(value) => handleStatusChange(order.id, value || order.status)}
                      >
                        <SelectTrigger className="w-36 rounded-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Chờ xác nhận</SelectItem>
                          <SelectItem value="processing">Đang đóng gói</SelectItem>
                          <SelectItem value="shipped">Đang giao</SelectItem>
                          <SelectItem value="delivered">Hoàn thành</SelectItem>
                          <SelectItem value="cancelled">Đã hủy</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-none"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderDetails(true);
                        }}
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        Chi tiết
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredOrders.length === 0 && (
        <div className="border border-zinc-200 py-12 text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
          <h3 className="text-lg font-black uppercase">Không tìm thấy đơn hàng</h3>
          <p className="mt-2 text-zinc-500">
            Không có đơn hàng phù hợp với bộ lọc hiện tại.
          </p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-col justify-between gap-3 border border-zinc-200 p-4 sm:flex-row sm:items-center">
          <span className="text-sm text-zinc-500">
            Hiển thị {(currentPage - 1) * pageLimit + 1} đến{" "}
            {Math.min(currentPage * pageLimit, totalOrders)} trong {totalOrders}{" "}
            đơn hàng
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-none"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Trước
            </Button>
            <span className="text-sm">
              Trang {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="rounded-none"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      )}

      {selectedOrder && (
        <OrderDetailsModal
          isOpen={showOrderDetails}
          onClose={() => {
            setShowOrderDetails(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
        />
      )}
    </div>
  );
}
