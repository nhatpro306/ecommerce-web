"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/hooks/queries";

export default function Home() {
  const { data: products = [], isLoading } = useProducts();
  const featuredProducts = useMemo(() => products.slice(0, 4), [products]);

  return (
    <div className="min-h-screen bg-stone-50 text-zinc-900">
      <section className="border-b border-zinc-200 bg-gradient-to-b from-zinc-900 to-zinc-700 text-zinc-50">
        <div className="container mx-auto px-4 py-20">
          <p className="mb-3 text-sm tracking-[0.3em]">SAIGON LOCAL</p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
            Vietnam Local Streetwear
          </h1>
          <p className="mt-4 max-w-xl text-zinc-300">
            Local identity, modern streetwear. Designed for movement, built for
            daily wear.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/products">
              <Button className="cursor-pointer bg-zinc-100 text-zinc-900 hover:bg-white">
                Shop New Drop
              </Button>
            </Link>
            <Link href="/products">
              <Button
                variant="outline"
                className="cursor-pointer border-zinc-300 text-zinc-100 hover:bg-zinc-800"
              >
                View Collection
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-14">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-semibold">Featured Products</h2>
          <Link href="/products" className="text-sm underline underline-offset-4">
            Xem tất cả
          </Link>
        </div>
        {isLoading ? (
          <p>Đang tải sản phẩm...</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.product_id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section className="bg-zinc-100 py-14">
        <div className="container mx-auto grid grid-cols-2 gap-4 px-4 md:grid-cols-4">
          {["T-Shirts", "Hoodies", "Pants", "Accessories"].map((category) => (
            <div
              key={category}
              className="rounded-lg border border-zinc-300 bg-white p-6 text-center"
            >
              <p className="text-sm tracking-wider text-zinc-500">CATEGORY</p>
              <h3 className="mt-2 text-lg font-semibold">{category}</h3>
            </div>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-14">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold">Brand Story</h2>
          <p className="mt-4 leading-7 text-zinc-700">
            SAIGON LOCAL ra đời từ tinh thần đường phố Việt Nam: tối giản,
            thực dụng và tự tin. Chúng tôi tập trung vào form mặc hàng ngày,
            chất liệu bền, và tinh thần local brand hiện đại.
          </p>
        </div>
      </section>
    </div>
  );
}
