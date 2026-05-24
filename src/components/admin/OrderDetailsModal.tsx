"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { Calendar, MapPin, Package, Phone, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { adminOrderService, OrderWithDetails } from "@/services/admin/adminOrderService";
import { formatCurrency } from "@/utils/formatCurrency";
import { getProductImage } from "@/utils/productImages";
import { useI18n } from "@/lib/i18n";
import { getOrderStatusLabel } from "@/lib/i18n/status";

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderWithDetails;
  onCancelOrder?: (orderId: number) => Promise<void> | void;
  onDeleteOrder?: (orderId: number) => Promise<void> | void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "delivered":
      return "bg-emerald-100 text-emerald-800";
    case "shipped":
      return "bg-sky-100 text-sky-800";
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

const paymentLabels: Record<string, string> = {
  cod: "COD",
  bank_transfer: "Bank transfer",
  stripe: "Stripe",
};

export function OrderDetailsModal({ isOpen, onClose, order, onCancelOrder, onDeleteOrder }: OrderDetailsModalProps) {
  const { t, locale } = useI18n();
  const [orderDetails, setOrderDetails] = useState<OrderWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !order?.id) return;

    let cancelled = false;
    async function loadOrderDetails() {
      setIsLoading(true);
      const details = await adminOrderService.getOrderDetails(order.id);
      if (!cancelled) {
        setOrderDetails(details || order);
        setIsLoading(false);
      }
    }
    loadOrderDetails();
    return () => {
      cancelled = true;
    };
  }, [isOpen, order]);

  if (!order) return null;
  const activeOrder = orderDetails || order;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[84vh] max-w-3xl rounded-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase">
            <Package className="h-5 w-5" />
            {t("orders.customerDetailsTitle")} #{order.id}
          </DialogTitle>
          <DialogDescription>{t("orders.customerDetailsDescription")}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[62vh]">
          <div className="space-y-6 pr-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="border border-zinc-200 p-4">
                <p className="flex items-center text-sm font-bold uppercase tracking-[0.14em]">
                  <Calendar className="mr-2 h-4 w-4" />
                  {t("orders.orderDate")}
                </p>
                <p className="mt-2 text-sm text-zinc-600">
                  {activeOrder.created_at ? format(new Date(activeOrder.created_at), "dd/MM/yyyy HH:mm") : t("orders.noDate")}
                </p>
              </div>
              <div className="border border-zinc-200 p-4">
                <p className="text-sm font-bold uppercase tracking-[0.14em]">{t("orders.total")}</p>
                <p className="mt-2 text-lg font-black">{formatCurrency(activeOrder.total)}</p>
              </div>
              <div className="border border-zinc-200 p-4">
                <p className="text-sm font-bold uppercase tracking-[0.14em]">{t("status.pending")}</p>
                <Badge className={`mt-2 rounded-none ${getStatusColor(activeOrder.status)}`}>{getOrderStatusLabel(activeOrder.status, locale)}</Badge>
              </div>
              <div className="border border-zinc-200 p-4">
                <p className="text-sm font-bold uppercase tracking-[0.14em]">{t("checkout.paymentMethod")}</p>
                <p className="mt-2 text-sm text-zinc-600">{paymentLabels[activeOrder.payment_method || ""] || activeOrder.payment_method || t("orders.notSelected")}</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">{t("orders.paymentStatus")}</p>
                <p className="mt-1 text-sm text-zinc-600">{activeOrder.payment_method === "bank_transfer" ? t("orders.bankChecking") : t("orders.unpaid")}</p>
              </div>
            </div>

            <Separator />
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-lg font-black uppercase"><User className="h-5 w-5" />{t("orders.customer")}</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div><p className="text-sm font-bold">{t("orders.customerName")}</p><p className="text-sm text-zinc-600">{activeOrder.customer_name || activeOrder.profile?.username || t("orders.notProvided")}</p></div>
                <div><p className="text-sm font-bold">{t("orders.email")}</p><p className="text-sm text-zinc-600">{activeOrder.customer_email || activeOrder.profile?.email || t("orders.notProvided")}</p></div>
                <div><p className="text-sm font-bold">{t("orders.phone")}</p><p className="flex items-center gap-1 text-sm text-zinc-600"><Phone className="h-3 w-3" />{activeOrder.customer_phone || t("orders.notProvided")}</p></div>
                <div><p className="text-sm font-bold">{t("orders.note")}</p><p className="text-sm text-zinc-600">{activeOrder.customer_note || t("orders.none")}</p></div>
              </div>
            </section>

            {activeOrder.shipping_address && (
              <>
                <Separator />
                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-black uppercase"><MapPin className="h-5 w-5" />{t("orders.shippingAddress")}</h3>
                  <div className="border border-zinc-200 p-4">
                    <p className="font-bold">{activeOrder.shipping_address.street}</p>
                    <p className="text-sm text-zinc-600">{activeOrder.shipping_address.city}, {activeOrder.shipping_address.state} {activeOrder.shipping_address.zip_code}</p>
                    <p className="text-sm text-zinc-600">{activeOrder.shipping_address.country}</p>
                  </div>
                </section>
              </>
            )}

            <Separator />
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-lg font-black uppercase"><Package className="h-5 w-5" />{t("orders.products")}</h3>
              {isLoading ? (
                <div className="flex h-32 items-center justify-center text-sm text-zinc-500">{t("orders.loadingProducts")}</div>
              ) : activeOrder.order_items && activeOrder.order_items.length > 0 ? (
                <div className="space-y-3">
                  {activeOrder.order_items.map((item) => {
                    const title = item.product_title_snapshot || item.product?.title || t("orders.productsMissing");
                    const image =
                      item.product_image_snapshot ||
                      (item.product
                        ? getProductImage({ ...item.product, description: "", price: item.price, stock: 0 })
                        : getProductImage({ product_id: item.product_id, title, description: "", price: item.price, stock: 0 }));
                    return (
                      <div key={item.id} className="grid grid-cols-[64px_1fr_auto] gap-4 border border-zinc-200 p-4">
                        <div className="relative h-16 w-16 overflow-hidden bg-zinc-100">
                          <Image src={image} alt={title} fill className="object-cover" />
                        </div>
                        <div>
                          <h4 className="font-bold">{title}</h4>
                          <p className="text-sm text-zinc-500">{t("orders.quantity")}: {item.quantity}</p>
                          <p className="text-sm text-zinc-500">{t("products.selectSize")}: {item.size_snapshot || item.selected_size || "-"} / {t("products.selectColor")}: {item.color_snapshot || item.selected_color || "-"}</p>
                          {item.sku_snapshot && <p className="text-sm text-zinc-500">SKU: {item.sku_snapshot}</p>}
                          <p className="text-sm text-zinc-500">{t("orders.unitPrice")}: {formatCurrency(item.price)}</p>
                        </div>
                        <p className="font-black">{formatCurrency(item.quantity * item.price)}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-zinc-200 p-8 text-center text-zinc-500">{t("orders.notFoundProducts")}</div>
              )}
            </section>
          </div>
        </ScrollArea>

        <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {onCancelOrder && activeOrder.status !== "cancelled" && (
              <Button variant="outline" className="rounded-none text-amber-700 hover:bg-amber-50 hover:text-amber-800" onClick={async () => { await onCancelOrder(activeOrder.id); onClose(); }}>
                {t("orders.cancelOrder")}
              </Button>
            )}
            {onDeleteOrder && (
              <Button variant="outline" className="rounded-none text-red-600 hover:bg-red-50 hover:text-red-700" onClick={async () => { await onDeleteOrder(activeOrder.id); onClose(); }}>
                {t("orders.deleteOrder")}
              </Button>
            )}
          </div>
          <Button variant="outline" className="rounded-none" onClick={onClose}>{t("common.close")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
