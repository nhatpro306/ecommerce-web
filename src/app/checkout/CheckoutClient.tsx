"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      accountName: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || "RESEY",
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
          selected_size: item.selected_size,
          selected_color: item.selected_color,
          variant_info: item.variant_info ?? {
            size: item.selected_size,
            color: item.selected_color,
          },
        })),
        shippingAddress: savedAddress,
        totalAmount: subtotal,
        paymentMethod,
        customerName: form.fullName.trim(),
        customerPhone: form.phone.trim(),
        customerEmail: form.email.trim(),
        customerNote: form.note.trim(),
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

  const inputClass = "h-12 rounded-none border-zinc-300";

  return (
    <div className="bg-white text-zinc-950">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-10 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="border-b border-zinc-200 pb-5">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
              Checkout
            </p>
            <h1 className="mt-2 text-3xl font-black uppercase">
              Thông tin giao hàng
            </h1>
          </div>

          <div className="mt-6 grid gap-4">
            <Input
              className={inputClass}
              placeholder="Họ và tên *"
              value={form.fullName}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  fullName: event.target.value,
                }))
              }
            />
            <Input
              className={inputClass}
              placeholder="Số điện thoại *"
              value={form.phone}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  phone: event.target.value,
                }))
              }
            />
            <Input
              className={inputClass}
              placeholder="Email (không bắt buộc)"
              value={form.email}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  email: event.target.value,
                }))
              }
            />
            <Input
              className={inputClass}
              placeholder="Địa chỉ *"
              value={form.street}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  street: event.target.value,
                }))
              }
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input
                className={inputClass}
                placeholder="Quận/Huyện *"
                value={form.city}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    city: event.target.value,
                  }))
                }
              />
              <Input
                className={inputClass}
                placeholder="Tỉnh/TP"
                value={form.state}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    state: event.target.value,
                  }))
                }
              />
              <Input
                className={inputClass}
                placeholder="Mã bưu chính *"
                value={form.zipCode}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    zipCode: event.target.value,
                  }))
                }
              />
            </div>
            <Input
              className={inputClass}
              placeholder="Ghi chú"
              value={form.note}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, note: event.target.value }))
              }
            />
          </div>

          <div className="mt-8">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em]">
              Phương thức thanh toán
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                ["cod", "COD", "Thanh toán khi nhận hàng"],
                ["bank_transfer", "Chuyển khoản", "Chuyển khoản ngân hàng"],
              ].map(([value, title, description]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPaymentMethod(value as PaymentMethod)}
                  className={`border p-5 text-left transition ${
                    paymentMethod === value
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-300 bg-white hover:border-zinc-950"
                  }`}
                >
                  <span className="block text-sm font-black uppercase tracking-[0.16em]">
                    {title}
                  </span>
                  <span className="mt-2 block text-xs opacity-70">
                    {description}
                  </span>
                </button>
              ))}
            </div>

            {paymentMethod === "bank_transfer" && (
              <div className="mt-4 border border-zinc-200 bg-zinc-50 p-5 text-sm">
                <p>Ngân hàng: {bankConfig.name}</p>
                <p>Chủ tài khoản: {bankConfig.accountName}</p>
                <p>Số tài khoản: {bankConfig.accountNumber}</p>
                <p className="mt-2 text-zinc-600">
                  Nội dung chuyển khoản sẽ hiển thị sau khi tạo đơn: ORDER-
                  {"{id}"}
                </p>
              </div>
            )}
          </div>
        </section>

        <aside className="border border-zinc-200 p-5 lg:sticky lg:top-28 lg:self-start">
          <h2 className="text-lg font-black uppercase">Đơn hàng của bạn</h2>
          <div className="mt-5 space-y-4">
            {cartItems.map((item) => (
              <div
                key={item.cart_item_id ?? item.product_id}
                className="flex justify-between gap-4 border-b border-zinc-100 pb-4 text-sm"
              >
                <span>
                  <span className="font-bold">{item.title}</span> x {item.quantity}
                  {(item.selected_size || item.selected_color) && (
                    <span className="mt-1 block text-xs text-zinc-500">
                      Size: {item.selected_size || "-"} / Màu:{" "}
                      {item.selected_color || "-"}
                    </span>
                  )}
                </span>
                <span className="font-semibold">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-between border-t border-zinc-200 pt-5 text-lg font-black">
            <span>Tổng</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <Button
            onClick={submitOrder}
            className="mt-5 h-12 w-full cursor-pointer rounded-none bg-zinc-950 text-xs font-bold uppercase tracking-[0.18em] text-white hover:bg-zinc-800"
            disabled={isSubmitting || !canSubmit}
          >
            {isSubmitting ? "Đang xử lý..." : "Đặt hàng"}
          </Button>
        </aside>
      </div>
    </div>
  );
}
