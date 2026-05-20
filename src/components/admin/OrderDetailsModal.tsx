"use client";

import Image from "next/image";
import { format } from "date-fns";
import { Calendar, MapPin, Package, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OrderWithDetails } from "@/services/admin/adminOrderService";
import { useOrder } from "@/hooks/queries";
import { formatCurrency } from "@/utils/formatCurrency";
import { getProductImage } from "@/utils/productImages";

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderWithDetails;
}

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

export function OrderDetailsModal({
  isOpen,
  onClose,
  order,
}: OrderDetailsModalProps) {
  const { data: orderDetails, isLoading } = useOrder(
    isOpen && order ? order.id.toString() : "",
  );

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[84vh] max-w-2xl rounded-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black uppercase">
            <Package className="h-5 w-5" />
            Đơn hàng #{order.id}
          </DialogTitle>
          <DialogDescription>
            Chi tiết khách hàng, địa chỉ giao hàng và sản phẩm trong đơn.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[62vh]">
          <div className="space-y-6 pr-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="border border-zinc-200 p-4">
                <p className="flex items-center text-sm font-bold uppercase tracking-[0.14em]">
                  <Calendar className="mr-2 h-4 w-4" />
                  Ngày đặt
                </p>
                <p className="mt-2 text-sm text-zinc-600">
                  {order.created_at
                    ? format(new Date(order.created_at), "dd/MM/yyyy HH:mm")
                    : "Chưa có ngày"}
                </p>
              </div>

              <div className="border border-zinc-200 p-4">
                <p className="text-sm font-bold uppercase tracking-[0.14em]">
                  Tổng tiền
                </p>
                <p className="mt-2 text-lg font-black">
                  {formatCurrency(order.total)}
                </p>
              </div>

              <div className="border border-zinc-200 p-4">
                <p className="text-sm font-bold uppercase tracking-[0.14em]">
                  Trạng thái
                </p>
                <Badge className={`mt-2 rounded-none ${getStatusColor(order.status)}`}>
                  {mapStatusLabel(order.status)}
                </Badge>
              </div>

              <div className="border border-zinc-200 p-4">
                <p className="text-sm font-bold uppercase tracking-[0.14em]">
                  Thanh toán
                </p>
                <p className="mt-2 text-sm text-zinc-600">
                  {order.payment_method || "Chưa xác định"}
                </p>
              </div>
            </div>

            <Separator />

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-lg font-black uppercase">
                <User className="h-5 w-5" />
                Khách hàng
              </h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <p className="text-sm font-bold">Tên</p>
                  <p className="text-sm text-zinc-600">
                    {order.customer_name ||
                      order.profile?.username ||
                      "Chưa cung cấp"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-bold">Email</p>
                  <p className="text-sm text-zinc-600">
                    {order.customer_email ||
                      order.profile?.email ||
                      "Chưa cung cấp"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-bold">Số điện thoại</p>
                  <p className="text-sm text-zinc-600">
                    {order.customer_phone || "Chưa cung cấp"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-bold">Ghi chú</p>
                  <p className="text-sm text-zinc-600">
                    {order.customer_note || "Không có"}
                  </p>
                </div>
              </div>
            </section>

            {order.shipping_address && (
              <>
                <Separator />
                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-black uppercase">
                    <MapPin className="h-5 w-5" />
                    Địa chỉ giao hàng
                  </h3>
                  <div className="border border-zinc-200 p-4">
                    <p className="font-bold">{order.shipping_address.street}</p>
                    <p className="text-sm text-zinc-600">
                      {order.shipping_address.city},{" "}
                      {order.shipping_address.state}{" "}
                      {order.shipping_address.zip_code}
                    </p>
                    <p className="text-sm text-zinc-600">
                      {order.shipping_address.country}
                    </p>
                  </div>
                </section>
              </>
            )}

            <Separator />

            <section>
              <h3 className="mb-3 flex items-center gap-2 text-lg font-black uppercase">
                <Package className="h-5 w-5" />
                Sản phẩm
              </h3>

              {isLoading ? (
                <div className="flex h-32 items-center justify-center text-sm text-zinc-500">
                  Đang tải sản phẩm...
                </div>
              ) : orderDetails?.order_items ? (
                <div className="space-y-3">
                  {orderDetails.order_items.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[64px_1fr_auto] gap-4 border border-zinc-200 p-4"
                    >
                      <div className="relative h-16 w-16 overflow-hidden bg-zinc-100">
                        <Image
                          src={
                            item.product
                              ? getProductImage({
                                  ...item.product,
                                  description: "",
                                  price: item.price,
                                  stock: 0,
                                })
                              : getProductImage({
                                  product_id: item.product_id,
                                  title: "Sản phẩm",
                                  description: "",
                                  price: item.price,
                                  stock: 0,
                                })
                          }
                          alt={item.product?.title || "Sản phẩm"}
                          fill
                          className="object-cover"
                        />
                      </div>

                      <div>
                        <h4 className="font-bold">{item.product?.title}</h4>
                        <p className="text-sm text-zinc-500">
                          Số lượng: {item.quantity}
                        </p>
                        <p className="text-sm text-zinc-500">
                          Size: {item.selected_size || "-"} / Màu:{" "}
                          {item.selected_color || "-"}
                        </p>
                        <p className="text-sm text-zinc-500">
                          Đơn giá: {formatCurrency(item.price)}
                        </p>
                      </div>

                      <p className="font-black">
                        {formatCurrency(item.quantity * item.price)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-zinc-200 p-8 text-center text-zinc-500">
                  Không tìm thấy sản phẩm trong đơn hàng.
                </div>
              )}
            </section>
          </div>
        </ScrollArea>

        <div className="flex justify-end border-t pt-4">
          <Button variant="outline" className="rounded-none" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
