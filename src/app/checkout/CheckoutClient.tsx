"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { sendOrderCreatedNotificationAction } from "@/app/checkout/notification-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase/client";
import { addressService } from "@/services/address/addressService";
import { orderService } from "@/services/order/orderService";
import { formatCurrency } from "@/utils/formatCurrency";

interface BankConfig {
  name: string;
  accountName: string;
  accountNumber: string;
}

type PaymentMethod = "cod" | "bank_transfer";

const VIETNAMESE_PHONE_PATTERN = /^0\d{9}$/;

export default function CheckoutClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { cartItems, subtotal, clearCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [storeBankConfig, setStoreBankConfig] = useState<BankConfig | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    detailedAddress: "",
    ward: "",
    district: "",
    provinceCity: "",
    note: "",
  });

  useEffect(() => {
    async function loadStoreSettings() {
      const { data, error } = await supabase
        .from("store_settings")
        .select("bank_name, bank_account_name, bank_account_number")
        .eq("id", 1)
        .maybeSingle();

      if (error || !data) return;

      setStoreBankConfig({
        name: data.bank_name || "Vietcombank",
        accountName: data.bank_account_name || "RESEY",
        accountNumber: data.bank_account_number || "0123456789",
      });
    }

    loadStoreSettings();
  }, []);

  const bankConfig = useMemo(
    () =>
      storeBankConfig || {
        name: process.env.NEXT_PUBLIC_BANK_NAME || "Vietcombank",
        accountName: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || "RESEY",
        accountNumber:
          process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || "0123456789",
      },
    [storeBankConfig],
  );

  const isPhoneValid = VIETNAMESE_PHONE_PATTERN.test(form.phone.trim());
  const canSubmit =
    form.fullName.trim() &&
    form.phone.trim() &&
    isPhoneValid &&
    form.detailedAddress.trim() &&
    form.ward.trim() &&
    form.district.trim() &&
    form.provinceCity.trim() &&
    cartItems.length > 0;

  const submitOrder = async () => {
    if (!user) {
      toast.error("Vui lòng đăng nhập để thanh toán.");
      return;
    }

    if (!canSubmit) {
      toast.error(
        isPhoneValid
          ? "Vui lòng nhập đủ thông tin giao hàng bắt buộc."
          : "Số điện thoại phải bắt đầu bằng 0 và có đúng 10 chữ số.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const streetAddress = [
        form.detailedAddress.trim(),
        form.ward.trim(),
      ].join(", ");

      const savedAddress = await addressService.saveAddress({
        userId: user.id,
        address: {
          id: 0,
          user_id: user.id,
          street: streetAddress,
          city: form.district.trim(),
          state: form.provinceCity.trim(),
          zip_code: "00000",
          country: "Vietnam",
          is_default: false,
        },
      });

      const order = await orderService.createOrder({
        userId: user.id,
        items: cartItems.map((item) => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
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

      try {
        await sendOrderCreatedNotificationAction({
          orderId: order.id,
          customerName: form.fullName.trim(),
          customerEmail: form.email.trim() || undefined,
          total: order.total,
          paymentMethod,
        });
      } catch (notificationError) {
        console.warn("Order notification failed:", notificationError);
      }

      await clearCart();

      router.push(
        `/checkout/success?order_id=${order.id}&payment_method=${paymentMethod}&total=${order.total}`,
      );
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Đặt hàng thất bại, vui lòng thử lại.",
      );
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
              Thanh toán
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
                setForm((previous) => ({ ...previous, fullName: event.target.value }))
              }
            />
            <Input
              className={inputClass}
              placeholder="Số điện thoại *"
              value={form.phone}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, phone: event.target.value }))
              }
            />
            <Input
              className={inputClass}
              placeholder="Email (không bắt buộc)"
              value={form.email}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, email: event.target.value }))
              }
            />
            <Input
              className={inputClass}
              placeholder="Địa chỉ chi tiết (số nhà, tên đường) *"
              value={form.detailedAddress}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  detailedAddress: event.target.value,
                }))
              }
            />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input
                className={inputClass}
                placeholder="Phường/Xã *"
                value={form.ward}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, ward: event.target.value }))
                }
              />
              <Input
                className={inputClass}
                placeholder="Quận/Huyện *"
                value={form.district}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    district: event.target.value,
                  }))
                }
              />
              <Input
                className={inputClass}
                placeholder="Tỉnh/Thành phố *"
                value={form.provinceCity}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    provinceCity: event.target.value,
                  }))
                }
              />
            </div>
            {form.phone && !isPhoneValid && (
              <p className="text-sm text-red-600">
                Số điện thoại phải bắt đầu bằng 0 và có đúng 10 chữ số.
              </p>
            )}
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
                key={item.cart_item_id ?? `${item.product_id}-${item.variant_id}`}
                className="flex justify-between gap-4 border-b border-zinc-100 pb-4 text-sm"
              >
                <span>
                  <span className="font-bold">{item.title}</span> x {item.quantity}
                  {(item.selected_size || item.selected_color) && (
                    <span className="mt-1 block text-xs text-zinc-500">
                      Size: {item.selected_size || "-"} / Màu: {item.selected_color || "-"}
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
