"use client";

import { useCallback, useEffect, useState } from "react";
import { Calendar, Eye, Filter, Package, Search, User } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
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
import { OrderDetailsModal } from "@/components/admin/OrderDetailsModal";
import { formatCurrency } from "@/utils/formatCurrency";

const statusOptions = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "pending", label: "pending" },
  { value: "processing", label: "confirmed" },
  { value: "shipped", label: "shipping" },
  { value: "delivered", label: "completed" },
  { value: "cancelled", label: "cancelled" },
];

const mapStatusLabel = (status: string) => {
  switch (status) {
    case "processing":
      return "confirmed";
    case "shipped":
      return "shipping";
    case "delivered":
      return "completed";
    default:
      return status;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "delivered":
    case "shipped":
      return "bg-green-100 text-green-800";
    case "processing":
      return "bg-blue-100 text-blue-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-zinc-100 text-zinc-800";
  }
};

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
  }, [filters, currentPage, pageLimit]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      await adminOrderService.updateOrderStatus(orderId, newStatus);
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

  const filteredOrders = orders.filter((order) => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      order.id.toString().includes(searchLower) ||
      order.profile?.username?.toLowerCase().includes(searchLower) ||
      order.profile?.email?.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(totalOrders / pageLimit);

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
            Admin
          </p>
          <h1 className="mt-2 text-3xl font-black uppercase">
            Quản lý đơn hàng
          </h1>
          <p className="mt-1 text-zinc-500">
            Theo dõi khách hàng, thanh toán và trạng thái xử lý.
          </p>
        </div>
        <span className="text-sm font-bold uppercase tracking-[0.14em] text-zinc-500">
          {totalOrders} đơn hàng
        </span>
      </div>

      <div className="grid gap-3 border border-zinc-200 p-4 lg:grid-cols-[1fr_auto]">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Tìm theo mã đơn, tên khách hoặc email..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="rounded-none border-zinc-300"
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-400" />
            <Select
              value={filters.status || "all"}
              onValueChange={(value) => {
                if (value) {
                  handleFilterChange("status", value === "all" ? "" : value);
                }
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

      <div className="space-y-4">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <article key={order.id} className="border border-zinc-200 p-5">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <h2 className="text-lg font-black uppercase">
                    Đơn hàng #{order.id}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-zinc-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {order.created_at
                        ? format(new Date(order.created_at), "dd/MM/yyyy")
                        : "Chưa có ngày"}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {order.profile?.username || "Khách hàng"}
                    </span>
                    <span className="font-bold text-zinc-950">
                      {formatCurrency(order.total)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={getStatusColor(order.status)}>
                    {mapStatusLabel(order.status)}
                  </Badge>
                  <Select
                    value={order.status}
                    onValueChange={(value) => {
                      if (value) {
                        handleStatusChange(order.id, value);
                      }
                    }}
                  >
                    <SelectTrigger className="w-36 rounded-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">pending</SelectItem>
                      <SelectItem value="processing">confirmed</SelectItem>
                      <SelectItem value="shipped">shipping</SelectItem>
                      <SelectItem value="delivered">completed</SelectItem>
                      <SelectItem value="cancelled">cancelled</SelectItem>
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
              </div>
            </article>
          ))
        ) : (
          <div className="border border-zinc-200 py-12 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
            <h3 className="text-lg font-black uppercase">
              Không tìm thấy đơn hàng
            </h3>
            <p className="mt-2 text-zinc-500">
              Không có đơn hàng phù hợp với bộ lọc hiện tại.
            </p>
          </div>
        )}
      </div>

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
