"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { ProductType } from "@/types";
import { formatCurrency } from "@/utils/formatCurrency";
import { getProductImage } from "@/utils/productImages";

interface ProductCardProps {
  product: ProductType;
}

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const productPath = `/products/${product.slug || product.product_id}`;
  const productImage = getProductImage(product);

  return (
    <article
      onClick={() => router.push(productPath)}
      className="group cursor-pointer bg-white"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-zinc-100">
        <Image
          src={productImage}
          alt={product.title}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            router.push(productPath);
          }}
          disabled={product.stock === 0}
          className="absolute inset-x-3 bottom-3 translate-y-3 bg-zinc-950 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white opacity-0 transition duration-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 group-hover:translate-y-0 group-hover:opacity-100"
        >
          {product.stock === 0 ? "Hết hàng" : "Xem chi tiết"}
        </button>

        {product.stock > 0 && product.stock <= 5 && (
          <span className="absolute left-3 top-3 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-950">
            Còn {product.stock}
          </span>
        )}
      </div>

      <div className="space-y-2 py-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-sm font-bold uppercase tracking-[0.08em] text-zinc-950">
            {product.title}
          </h3>
          <Eye className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 transition group-hover:text-zinc-950" />
        </div>
        <p className="text-sm font-semibold text-zinc-900">
          {formatCurrency(product.price)}
        </p>
        <p className="line-clamp-2 text-xs leading-5 text-zinc-500">
          {product.description || "Vietnam local streetwear."}
        </p>
      </div>
    </article>
  );
}
