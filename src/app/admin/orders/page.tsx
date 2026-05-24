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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderFilters, OrderWithDetails } from "@/services/admin/adminOrderService";
import { formatCurrency } from "@/utils/formatCurrency";
import { useI18n } from "@/lib/i18n";
import { getOrderStatusLabel } from "@/lib/i18n/status";

import { deleteAdminOrderAction, getAdminOrdersAction, updateAdminOrderStatusAction } from "./actions";

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

function getPaymentStatusLabel(order: OrderWithDetails, t: (key: string) => string) {
  if (order.payment_method === "bank_transfer") return t("orders.bankChecking");
  return t("orders.unpaid");
}

function getProductSummary(order: OrderWithDetails, t: (key: string) => string) {
  const items = order.order_items || [];
  if (items.length === 0) return t("orders.productsMissing");

  const firstItem = items[0];
  const firstTitle = firstItem.product_title_snapshot || firstItem.product?.title || t("orders.productsMissing");
  const variantText = [firstItem.color_snapshot || firstItem.selected_color, firstItem.size_snapshot || firstItem.selected_size, firstItem.sku_snapshot]
    .filter(Boolean)
    .join(" / ");

  return `${firstTitle}${variantText ? ` (${variantText})` : ""}${items.length > 1 ? ` +${items.length - 1}` : ""}`;
}

function getCustomerName(order: OrderWithDetails, t: (key: string) => string) {
  return order.customer_name || order.profile?.username || t("orders.customer");
}

function getCustomerContact(order: OrderWithDetails, t: (key: string) => string) {
  return order.customer_phone || order.customer_email || order.profile?.email || t("orders.contactMissing");
}

function getAddressText(order: OrderWithDetails, t: (key: string) => string) {
  if (!order.shipping_address) return t("orders.addressMissing");
  return [order.shipping_address.street, order.shipping_address.city, order.shipping_address.state, order.shipping_address.zip_code, order.shipping_address.country]
    .filter(Boolean)
    .join(", ");
}

export default function AdminOrdersPage() {
  const { t, locale } = useI18n();
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<OrderFilters>({});
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const pageLimit = 20;

  const statusOptions = useMemo(
    () => [
      { value: "all", label: t("orders.allStatuses") },
      { value: "pending", label: getOrderStatusLabel("pending", locale) },
      { value: "processing", label: getOrderStatusLabel("processing", locale) },
      { value: "shipped", label: getOrderStatusLabel("shipped", locale) },
      { value: "delivered", label: getOrderStatusLabel("delivered", locale) },
      { value: "cancelled", label: getOrderStatusLabel("cancelled", locale) },
    ],
    [locale, t],
  );

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAdminOrdersAction(filters, currentPage, pageLimit);
      setOrders(data.orders as OrderWithDetails[]);
      setTotalOrders(data.total);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error(t("orders.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, t]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      await updateAdminOrderStatusAction(orderId, newStatus);
      toast.success(t("orders.statusUpdated"));
      fetchOrders();
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error(t("orders.statusUpdateFailed"));
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    try {
      await updateAdminOrderStatusAction(orderId, "cancelled");
      toast.success(t("orders.cancelled"));
      fetchOrders();
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.error(t("orders.cancelFailed"));
    }
  };

  const handleDeleteOrder = async (orderId: number) => {
    const confirmed = typeof window === "undefined" ? true : window.confirm(t("orders.deleteConfirm"));
    if (!confirmed) return;
    try {
      const result = await deleteAdminOrderAction(orderId);
      if (result.status === "deleted") {
        toast.success(t("orders.deleted"));
      } else {
        toast.warning(result.reason);
      }
      fetchOrders();
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error(t("orders.deleteFailed"));
    }
  };

  const handleFilterChange = (key: keyof OrderFilters, value: string) => {
    setFilters((previous) => ({ ...previous, [key]: value || undefined }));
    setCurrentPage(1);
  };

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return orders;
    return orders.filter((order) => {
      const searchText = [order.id, getCustomerName(order, t), getCustomerContact(order, t), getAddressText(order, t), order.payment_method]
        .join(" ")
        .toLowerCase();
      return searchText.includes(normalizedSearch);
    });
  }, [orders, searchTerm, t]);

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
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">{t("admin.title")}</p>
          <h1 className="mt-2 text-3xl font-black uppercase">{t("admin.orders")}</h1>
        </div>
        <span className="text-sm font-bold uppercase tracking-[0.14em] text-zinc-500">{totalOrders}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border border-zinc-200 p-4"><p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{t("orders.pageCurrent")}</p><p className="mt-2 text-2xl font-black">{orders.length}</p></div>
        <div className="border border-zinc-200 p-4"><p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{t("orders.pendingCount")}</p><p className="mt-2 text-2xl font-black">{pendingCount}</p></div>
        <div className="border border-zinc-200 p-4"><p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{t("orders.shippingCount")}</p><p className="mt-2 text-2xl font-black">{shippingCount}</p></div>
        <div className="border border-zinc-200 p-4"><p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{t("orders.pageRevenue")}</p><p className="mt-2 text-2xl font-black">{formatCurrency(pageRevenue)}</p></div>
      </div>

      <div className="grid gap-3 border border-zinc-200 p-4 lg:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input placeholder={t("orders.searchPlaceholder")} value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="rounded-none border-zinc-300 pl-9" />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-400" />
            <Select value={filters.status || "all"} onValueChange={(value) => handleFilterChange("status", value === "all" ? "" : value || "")}>
              <SelectTrigger className="w-full rounded-none sm:w-44"><SelectValue placeholder={t("orders.allStatuses")} /></SelectTrigger>
              <SelectContent>{statusOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Input type="date" value={filters.dateFrom || ""} onChange={(event) => handleFilterChange("dateFrom", event.target.value)} className="rounded-none border-zinc-300 sm:w-40" />
          <Input type="date" value={filters.dateTo || ""} onChange={(event) => handleFilterChange("dateTo", event.target.value)} className="rounded-none border-zinc-300 sm:w-40" />
        </div>
      </div>

      <div className="overflow-hidden border border-zinc-200">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="border-b bg-zinc-50 text-xs uppercase tracking-[0.14em] text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-bold">{t("orders.order")}</th>
                <th className="px-4 py-3 font-bold">{t("orders.customer")}</th>
                <th className="px-4 py-3 font-bold">{t("admin.products")}</th>
                <th className="px-4 py-3 font-bold">{t("checkout.addressDetail")}</th>
                <th className="px-4 py-3 font-bold">{t("checkout.paymentMethod")}</th>
                <th className="px-4 py-3 font-bold">{t("orders.paymentStatus")}</th>
                <th className="px-4 py-3 font-bold">{t("orders.total")}</th>
                <th className="px-4 py-3 font-bold">{t("status.pending")}</th>
                <th className="px-4 py-3 text-right font-bold">{t("common.processing")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="bg-white hover:bg-zinc-50">
                  <td className="px-4 py-4">
                    <p className="font-black">#{order.id}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500"><Calendar className="h-3 w-3" />{order.created_at ? format(new Date(order.created_at), "dd/MM/yyyy HH:mm") : t("orders.noDate")}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="flex items-center gap-1 font-bold"><User className="h-3 w-3" />{getCustomerName(order, t)}</p>
                    <p className="mt-1 text-xs text-zinc-500">{getCustomerContact(order, t)}</p>
                  </td>
                  <td className="max-w-[260px] px-4 py-4 text-zinc-700"><p className="line-clamp-2 font-semibold">{getProductSummary(order, t)}</p></td>
                  <td className="max-w-[260px] px-4 py-4 text-zinc-600"><p className="line-clamp-2">{getAddressText(order, t)}</p></td>
                  <td className="px-4 py-4 text-zinc-600">{order.payment_method || t("orders.notSelected")}</td>
                  <td className="px-4 py-4 text-zinc-600">{getPaymentStatusLabel(order, t)}</td>
                  <td className="px-4 py-4 font-black">{formatCurrency(order.total)}</td>
                  <td className="px-4 py-4"><Badge className={`rounded-none ${getStatusColor(order.status)}`}>{getOrderStatusLabel(order.status, locale)}</Badge></td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Select value={order.status} onValueChange={(value) => handleStatusChange(order.id, value || order.status)}>
                        <SelectTrigger className="w-36 rounded-none"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">{getOrderStatusLabel("pending", locale)}</SelectItem>
                          <SelectItem value="processing">{getOrderStatusLabel("processing", locale)}</SelectItem>
                          <SelectItem value="shipped">{getOrderStatusLabel("shipped", locale)}</SelectItem>
                          <SelectItem value="delivered">{getOrderStatusLabel("delivered", locale)}</SelectItem>
                          <SelectItem value="cancelled">{getOrderStatusLabel("cancelled", locale)}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" className="rounded-none" onClick={() => { setSelectedOrder(order); setShowOrderDetails(true); }}>
                        <Eye className="mr-1 h-3 w-3" />{t("orders.detail")}
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-none text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleDeleteOrder(order.id)}>
                        {t("common.delete")}
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
          <h3 className="text-lg font-black uppercase">{t("orders.findEmpty")}</h3>
          <p className="mt-2 text-zinc-500">{t("orders.findEmptyDesc")}</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-col justify-between gap-3 border border-zinc-200 p-4 sm:flex-row sm:items-center">
          <span className="text-sm text-zinc-500">
            {t("orders.showing", undefined, {
              from: (currentPage - 1) * pageLimit + 1,
              to: Math.min(currentPage * pageLimit, totalOrders),
              total: totalOrders,
            })}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-none" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>
              {t("orders.previous")}
            </Button>
            <span className="text-sm">{t("orders.page")} {currentPage} / {totalPages}</span>
            <Button variant="outline" size="sm" className="rounded-none" disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>
              {t("orders.next")}
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
          onCancelOrder={handleCancelOrder}
          onDeleteOrder={handleDeleteOrder}
        />
      )}
    </div>
  );
}
