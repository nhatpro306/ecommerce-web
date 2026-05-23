"use client";
import { OrderType } from "@/types";
import { OrderHistoryChart } from "./OrderHistoryChart";
import { PaymentDistributionChart } from "./PaymentDistributionChart";
import { OrderStatusChart } from "./OrderStatusChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatCurrency";

interface DashboardChartsProps {
  orders: OrderType[];
}

export function DashboardCharts({ orders }: DashboardChartsProps) {
  const totalOrderAmount = orders.reduce((sum, order) => sum + order.total, 0);
  const averageOrderValue = orders.length
    ? totalOrderAmount / orders.length
    : 0;
  const lastMonthOrders = orders.filter((order) => {
    if (!order.created_at) return false;
    const orderDate = new Date(order.created_at);
    const now = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(now.getMonth() - 1);
    return orderDate >= lastMonth;
  });
  const lastMonthTotal = lastMonthOrders.reduce(
    (sum, order) => sum + order.total,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Tổng đơn hàng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Doanh thu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalOrderAmount)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Giá trị đơn trung bình
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(averageOrderValue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Doanh thu 30 ngày gần đây
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(lastMonthTotal)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Lịch sử đơn hàng</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderHistoryChart orders={orders} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phương thức thanh toán</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentDistributionChart orders={orders} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trạng thái đơn hàng</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderStatusChart orders={orders} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
