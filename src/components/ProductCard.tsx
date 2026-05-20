import Image from "next/image";
import Link from "next/link";
import type { ProductType } from "@/types";

interface ProductCardProps {
  product: ProductType;
}

export function ProductCard({ product }: ProductCardProps) {
  const imageUrl = product.image || "/vercel.svg";
  const price = Number(product.price || 0);

  return (
    <Link href={`/products/${product.product_id}`} className="group block">
      <article className="overflow-hidden border border-zinc-200 bg-white transition hover:shadow-md">
        <div className="relative aspect-[3/4] bg-zinc-100">
          <Image
            src={imageUrl}
            alt={product.title || "Product image"}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        </div>

        <div className="space-y-2 p-3">
          <h3 className="line-clamp-2 text-sm font-semibold text-zinc-900">
            {product.title}
          </h3>

          <p className="text-sm font-bold text-zinc-950">
            ¥{price.toLocaleString()}
          </p>

          <p className="text-xs text-zinc-500">
            {product.stock > 0 ? "Còn hàng" : "Hết hàng"}
          </p>
        </div>
      </article>
    </Link>
  );
}