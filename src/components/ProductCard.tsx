"use client";

import Image from "next/image";
import Link from "next/link";
import type { ProductType } from "@/types";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/utils/formatCurrency";
import { getProductImage } from "@/utils/productImages";
import { getSellableStock } from "@/utils/productVisibility";

interface ProductCardProps {
  product: ProductType;
  tag?: { label: string; variant?: "maroon" | "default" };
}

const COLOR_MAP: Record<string, string> = {
  đen: "#09090b",
  black: "#09090b",
  trắng: "#f4f4f5",
  white: "#f4f4f5",
  nâu: "#78350f",
  brown: "#78350f",
  xám: "#71717a",
  gray: "#71717a",
  xanh: "#1d4ed8",
  blue: "#1d4ed8",
  đỏ: "#b91c1c",
  red: "#b91c1c",
  vàng: "#ca8a04",
  yellow: "#ca8a04",
  olive: "#4d7c0f",
  kem: "#e8dccc",
  cream: "#e8dccc",
  cam: "#c2410c",
  orange: "#c2410c",
};

export function ProductCard({ product, tag }: ProductCardProps) {
  const { t } = useI18n();
  const imageUrl = getProductImage(product);
  const sellableStock = getSellableStock(product);
  const inStock = sellableStock > 0;
  const price = Number(product.price || 0);
  const salePrice =
    product.sale_price && product.sale_price < price ? product.sale_price : null;
  const productHref = `/products/${product.slug || product.product_id}`;
  const categoryName = product.category?.name;

  const colorDots = product.colors?.slice(0, 5).map((c) => {
    const key = c.toLowerCase().trim();
    const hex = COLOR_MAP[key] ?? "#d4d4d8";
    return { name: c, hex };
  });

  return (
    <Link href={productHref} className="group block">
      <article className="relative border border-zinc-200 bg-white transition hover:border-zinc-400 hover:shadow-[0_8px_18px_-6px_rgb(0_0_0_/_0.16)]">
        {/* Tag badge */}
        {tag && (
          <span
            className={`absolute left-2.5 top-2.5 z-10 border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
              tag.variant === "maroon"
                ? "border-[#6e0f11] bg-[#6e0f11] text-white"
                : "border-zinc-950 bg-white text-zinc-950"
            }`}
          >
            {tag.label}
          </span>
        )}

        {/* Image */}
        <div className="relative aspect-[4/5] overflow-hidden bg-zinc-100">
          <Image
            src={imageUrl}
            alt={product.title || "Ảnh sản phẩm"}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
          />
          {/* Quick-add hover bar */}
          <span className="absolute inset-x-3 bottom-3 flex h-9 translate-y-2 items-center justify-center bg-zinc-950 text-[11px] font-bold uppercase tracking-[0.18em] text-white opacity-0 transition duration-180 group-hover:translate-y-0 group-hover:opacity-100">
            + {t("product_add_to_cart")}
          </span>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-1.5 p-3.5 pb-4">
          {categoryName && (
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
              {categoryName}
            </span>
          )}

          <h3 className="line-clamp-2 min-h-[36px] text-[13px] font-black uppercase leading-snug text-zinc-950">
            {product.title}
          </h3>

          <div className="flex items-center gap-2">
            <p className={`text-sm font-black ${salePrice ? "text-red-600" : "text-zinc-950"}`}>
              {formatCurrency(salePrice ?? price)}
            </p>
            {salePrice && (
              <p className="text-xs text-zinc-400 line-through">
                {formatCurrency(price)}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] font-bold uppercase tracking-[0.12em] ${
                inStock ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {inStock ? t("products_in_stock") : t("products_out_of_stock")}
            </span>
          </div>

          {colorDots && colorDots.length > 0 && (
            <div className="mt-0.5 flex gap-1">
              {colorDots.map((c, i) => (
                <span
                  key={i}
                  title={c.name}
                  className="h-[11px] w-[11px] rounded-full border border-black/15"
                  style={{ background: c.hex }}
                />
              ))}
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}
