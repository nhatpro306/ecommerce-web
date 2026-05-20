"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { addressService } from "@/services/address/addressService";
import { orderService } from "@/services/order/orderService";
import { getActiveCart } from "@/services/cart/cartService";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatCurrency";

type PaymentMethod = "cod" | "bank_transfer";

export default function CheckoutClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { cartItems, subtotal, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    note: "",
  });

  const bankConfig = useMemo(
    () => ({
      name: process.env.NEXT_PUBLIC_BANK_NAME || "Vietcombank",
      accountName:
        process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || "SAIGON LOCAL",
      accountNumber:
        process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || "0123456789",
    }),
    [],
  );

  const canSubmit =
    form.fullName.trim() &&
    form.phone.trim() &&
    form.street.trim() &&
    form.city.trim() &&
    form.zipCode.trim() &&
    cartItems.length > 0;

  const submitOrder = async () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để checkout.");
      return;
    }
    if (!canSubmit) {
      toast.error("Vui lòng nhập đủ thông tin bắt buộc.");
      return;
    }

    setIsSubmitting(true);
    try {
      const savedAddress = await addressService.saveAddress({
        userId: user.id,
        address: {
          id: 0,
          user_id: user.id,
          street: form.street,
          city: form.city,
          state: form.state,
          zip_code: form.zipCode,
          country: "Vietnam",
          is_default: false,
        },
      });

      const order = await orderService.createOrder({
        userId: user.id,
        items: cartItems.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
        })),
        shippingAddress: savedAddress,
        totalAmount: subtotal,
        paymentMethod,
      });

      const activeCart = await getActiveCart();
      if (activeCart) {
        await clearCart();
      }

      router.push(
        `/checkout/success?order_id=${order.id}&payment_method=${paymentMethod}`,
      );
    } catch (error) {
      console.error(error);
      toast.error("Đặt hàng thất bại, vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto grid grid-cols-1 gap-6 px-4 py-8 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Thông tin giao hàng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Họ và tên *"
            value={form.fullName}
            onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
          />
          <Input
            placeholder="Số điện thoại *"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          />
          <Input
            placeholder="Email (không bắt buộc)"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          />
          <Input
            placeholder="Địa chỉ *"
            value={form.street}
            onChange={(e) => setForm((p) => ({ ...p, street: e.target.value }))}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input
              placeholder="Quận/Huyện *"
              value={form.city}
              onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
            />
            <Input
              placeholder="Tỉnh/TP"
              value={form.state}
              onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
            />
            <Input
              placeholder="Mã bưu chính *"
              value={form.zipCode}
              onChange={(e) => setForm((p) => ({ ...p, zipCode: e.target.value }))}
            />
          </div>
          <Input
            placeholder="Ghi chú"
            value={form.note}
            onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
          />

          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium">Phương thức thanh toán</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={paymentMethod === "cod" ? "default" : "outline"}
                onClick={() => setPaymentMethod("cod")}
                className="cursor-pointer"
              >
                COD
              </Button>
              <Button
                type="button"
                variant={paymentMethod === "bank_transfer" ? "default" : "outline"}
                onClick={() => setPaymentMethod("bank_transfer")}
                className="cursor-pointer"
              >
                Chuyển khoản
              </Button>
            </div>
          </div>

          {paymentMethod === "bank_transfer" && (
            <div className="rounded-md border bg-zinc-50 p-4 text-sm">
              <p>Ngân hàng: {bankConfig.name}</p>
              <p>Chủ tài khoản: {bankConfig.accountName}</p>
              <p>Số tài khoản: {bankConfig.accountNumber}</p>
              <p className="mt-2 text-zinc-600">
                Nội dung chuyển khoản sẽ hiển thị sau khi tạo đơn: ORDER-{"{id}"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Đơn hàng của bạn</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {cartItems.map((item) => (
            <div key={item.product_id} className="flex justify-between text-sm">
              <span>
                {item.title} x {item.quantity}
              </span>
              <span>{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t pt-2 text-sm font-semibold">
            Tổng: {formatCurrency(subtotal)}
          </div>
          <Button
            onClick={submitOrder}
            className="w-full cursor-pointer"
            disabled={isSubmitting || !canSubmit}
          >
            {isSubmitting ? "Đang xử lý..." : "Đặt hàng"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
