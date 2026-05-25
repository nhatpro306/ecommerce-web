"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import ShoppingSkeleton from "@/components/ShoppingSkeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/utils/formatCurrency";
import { getProductImage } from "@/utils/productImages";

export default function CartShoppingPage() {
  const { cartItems, removeFromCart, updateQuantity, subtotal, isLoading } = useCart();
  const { user } = useAuth();
  const { t } = useI18n();

  if (isLoading) return <ShoppingSkeleton />;

  return (
    <div className="bg-white text-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <Link
          href="/products"
          className="inline-flex items-center text-xs font-bold uppercase tracking-[0.18em] text-zinc-500 hover:text-zinc-950"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("cart.continueShopping")}
        </Link>

        <div className="mt-6 border-b border-zinc-200 pb-5">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-zinc-500">{t("nav.cart")}</p>
          <h1 className="mt-2 text-3xl font-black uppercase">{t("cart.title")}</h1>
          {!user && cartItems.length > 0 && (
            <p className="mt-3 text-sm text-zinc-600">{t("cart.guestNotice")}</p>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div className="py-16 text-center">
            <h2 className="text-2xl font-black uppercase">{t("cart.emptyTitle")}</h2>
            <p className="mt-3 text-zinc-600">{t("cart.emptySub")}</p>
            <Link href="/products">
              <Button className="mt-6 h-12 rounded-none bg-zinc-950 px-7 text-xs font-bold uppercase tracking-[0.18em] text-white hover:bg-zinc-800">
                {t("cart.viewProducts")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {cartItems.map((item) => {
                const itemKey = `${item.cart_item_id ?? item.product_id}-${item.selected_size ?? ""}-${item.selected_color ?? ""}`;
                return (
                  <article
                    key={itemKey}
                    className="grid grid-cols-[120px_1fr] gap-4 border-b border-zinc-200 pb-5 md:grid-cols-[160px_1fr]"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden bg-zinc-100">
                      <Image src={getProductImage(item)} alt={item.title} fill className="object-cover" />
                    </div>
                    <div className="flex flex-col justify-between">
                      <div>
                        <h2 className="text-base font-black uppercase tracking-[0.08em]">{item.title}</h2>
                        <p className="mt-2 line-clamp-2 text-sm text-zinc-600">{item.description}</p>
                        <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                          {t("products.selectSize")}: {item.selected_size || "-"} / {t("products.selectColor")}:{" "}
                          {item.selected_color || "-"}
                        </p>
                        <p className="mt-3 text-sm font-bold">{formatCurrency(item.price)}</p>
                      </div>

                      <div className="mt-5 flex items-center justify-between">
                        <div className="inline-flex border border-zinc-300">
                          <button
                            type="button"
                            className="flex h-10 w-10 items-center justify-center"
                            onClick={() => updateQuantity(item.product_id, -1, item.cart_item_id)}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="flex h-10 w-12 items-center justify-center border-x border-zinc-300 text-sm font-bold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            className="flex h-10 w-10 items-center justify-center"
                            onClick={() => updateQuantity(item.product_id, 1, item.cart_item_id)}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        <button
                          type="button"
                          className="text-zinc-500 transition hover:text-red-600"
                          onClick={() => removeFromCart(item.product_id, item.cart_item_id)}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <aside className="border border-zinc-200 p-5 lg:sticky lg:top-28 lg:self-start">
              <h2 className="text-lg font-black uppercase">{t("checkout.orderSummary")}</h2>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>{t("cart.subtotal")}</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("cart.shippingFee")}</span>
                  <span>{t("cart.freeShipping")}</span>
                </div>
                <div className="flex items-start justify-between gap-3 border-t border-zinc-200 pt-4 text-lg font-black">
                  <span>{t("checkout.total")}</span>
                  <span className="text-right">{formatCurrency(subtotal)}</span>
                </div>
              </div>
              <Link href={user ? "/checkout" : "/signin"}>
                <Button className="mt-5 h-12 w-full rounded-none bg-zinc-950 text-xs font-bold uppercase tracking-[0.18em] text-white hover:bg-zinc-800">
                  {user ? t("cart.checkoutButton") : t("nav.signIn")}
                </Button>
              </Link>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
