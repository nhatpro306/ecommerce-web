import Image from "next/image";
import Link from "next/link";
import type { ProductType } from "@/types";
import { formatCurrency } from "@/utils/formatCurrency";
import { getProductImage } from "@/utils/productImages";
import { getSellableStock } from "@/utils/productVisibility";

interface ProductCardProps {
  product: ProductType;
}

export function ProductCard({ product }: ProductCardProps) {
  const imageUrl = getProductImage(product);
  const sellableStock = getSellableStock(product);
  const price = Number(product.price || 0);
  const productHref = `/products/${product.slug || product.product_id}`;

  return (
    <Link href={productHref} className="group block">
      <article className="overflow-hidden border border-zinc-200 bg-white text-zinc-950 transition hover:shadow-md">
        <div className="relative aspect-[4/5] bg-zinc-100">
          <Image
            src={imageUrl}
            alt={product.title || "Ảnh sản phẩm"}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        </div>

        <div className="space-y-2 p-3">
          <h3 className="line-clamp-2 text-sm font-black text-black">
            {product.title}
          </h3>

          <p className="text-sm font-black text-black">
            {formatCurrency(price)}
          </p>

          <p className="text-xs font-semibold text-zinc-700">
            {sellableStock > 0 ? "Còn hàng" : "Hết hàng"}
          </p>
        </div>
      </article>
    </Link>
  );
}

