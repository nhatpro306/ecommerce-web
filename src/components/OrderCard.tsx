import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderItemType, OrderType } from "@/types";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useDeleteOrder } from "@/hooks/queries";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/utils/formatCurrency";

interface OrderCardProps {
  order: OrderType;
  onDelete?: (orderId: number) => void;
}

const orderStatusLabels: Record<string, string> = {
  pending: "Chờ xác nhận",
  processing: "Đang xử lý",
  confirmed: "Đã xác nhận",
  shipped: "Đang giao",
  delivered: "Đã giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

export function OrderCard({ order, onDelete }: OrderCardProps) {
  const { user } = useAuth();
  const deleteOrder = useDeleteOrder();

  const handleDeleteOrder = async () => {
    try {
      await deleteOrder.mutateAsync({
        orderId: order.id.toString(),
        userId: user?.id,
      });
      toast.success("Đã xóa đơn hàng");
      onDelete?.(order.id);
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error("Không thể xóa đơn hàng");
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/20">
        <div className="flex flex-col justify-between md:flex-row">
          <CardTitle className="text-lg">Đơn hàng #{order.id}</CardTitle>
          <div className="mt-2 flex items-center space-x-4 md:mt-0">
            <span className="text-muted-foreground text-sm">
              {order.created_at
                ? format(new Date(order.created_at), "dd/MM/yyyy")
                : "Chưa có ngày"}
            </span>
            <span
              className={`rounded-full px-2 py-1 text-xs ${
                order.status === "delivered"
                  ? "bg-green-100 text-green-800"
                  : order.status === "shipped"
                    ? "bg-blue-100 text-blue-800"
                    : order.status === "processing"
                      ? "bg-orange-100 text-orange-800"
                      : order.status === "cancelled"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
              }`}
            >
              {orderStatusLabels[order.status] || order.status}
            </span>
            {order.status !== "cancelled" && (
              <Button
                variant="destructive"
                size="sm"
                className="ml-2 cursor-pointer"
                onClick={handleDeleteOrder}
                disabled={deleteOrder.isPending}
              >
                {deleteOrder.isPending ? "Đang xóa..." : "Xóa đơn"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {order.order_items?.map((item: OrderItemType) => (
            <div
              key={item.id}
              className="flex flex-col items-start justify-between border-b py-2 last:border-b-0 md:flex-row md:items-center"
            >
              <div className="flex items-center">
                {item.product?.image && (
                  <Image
                    src={item.product.image || ""}
                    alt={item.product.title}
                    width={48}
                    height={48}
                    className="mr-4 h-12 w-12 rounded object-cover"
                  />
                )}
                <div>
                  <p className="font-medium">
                    {item.product?.title || "Sản phẩm"}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Số lượng: {item.quantity} x {formatCurrency(item.price)}
                  </p>
                </div>
              </div>
              <p className="mt-2 font-medium md:mt-0">
                {formatCurrency(item.quantity * item.price)}
              </p>
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <div className="text-right">
              <p className="text-muted-foreground text-sm">Tổng tiền</p>
              <p className="text-lg font-bold">{formatCurrency(order.total)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
