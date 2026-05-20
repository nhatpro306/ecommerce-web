"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/hooks/queries";

const categories = [
  { label: "TẤT CẢ SẢN PHẨM", href: "/products" },
  { label: "TOPS", href: "/products?category=T-Shirts" },
  { label: "BOTTOMS", href: "/products?category=Pants" },
  { label: "ACCESSORIES", href: "/products?category=Accessories" },
];

export default function Home() {
  const { data: products = [], isLoading } = useProducts();
  const featuredProducts = useMemo(() => products.slice(0, 8), [products]);

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <section className="grid min-h-[78vh] lg:grid-cols-2">
        <div className="flex items-center bg-zinc-950 px-6 py-16 text-white md:px-12">
          <div className="max-w-xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.35em] text-zinc-400">
              SAIGON LOCAL / NEW DROP
            </p>
            <h1 className="text-5xl font-black uppercase leading-none tracking-tight md:text-7xl">
              Young City.
              <br />
              Local Uniform.
            </h1>
            <p className="mt-6 max-w-md text-sm leading-7 text-zinc-300">
              Vietnamese streetwear for everyday movement. Clean silhouettes,
              strong graphics, and practical fits made for Saigon rhythm.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products?sort=latest">
                <Button className="h-12 cursor-pointer rounded-none bg-white px-7 text-xs font-bold uppercase tracking-[0.18em] text-zinc-950 hover:bg-zinc-200">
                  Shop New Drop
                </Button>
              </Link>
              <Link href="/products">
                <Button
                  variant="outline"
                  className="h-12 cursor-pointer rounded-none border-white px-7 text-xs font-bold uppercase tracking-[0.18em] text-white hover:bg-white hover:text-zinc-950"
                >
                  View Collection
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="relative min-h-[420px]">
          <Image
            src="https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=1400&q=80"
            alt="SAIGON LOCAL streetwear campaign"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/10" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.label}
              href={category.href}
              className="border border-zinc-200 px-4 py-6 text-center text-xs font-black uppercase tracking-[0.18em] transition hover:border-zinc-950 hover:bg-zinc-950 hover:text-white"
            >
              {category.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-8 flex items-end justify-between border-b border-zinc-200 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
              New Arrivals
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase">
              Tất cả sản phẩm
            </h2>
          </div>
          <Link
            href="/products"
            className="text-xs font-bold uppercase tracking-[0.16em] underline underline-offset-4"
          >
            Xem tất cả
          </Link>
        </div>

        {isLoading ? (
          <p className="text-sm text-zinc-500">Đang tải sản phẩm...</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.product_id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-14 md:grid-cols-2">
        <div className="relative min-h-[360px] overflow-hidden bg-zinc-100">
          <Image
            src="https://images.unsplash.com/photo-1506629905607-d405b7a30db9?auto=format&fit=crop&w=1200&q=80"
            alt="Local streetwear detail"
            fill
            className="object-cover"
          />
        </div>
        <div className="flex items-center border border-zinc-200 p-8 md:p-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
              Thương hiệu
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase">
              Local identity, modern streetwear.
            </h2>
            <p className="mt-5 leading-7 text-zinc-600">
              SAIGON LOCAL lấy cảm hứng từ nhịp sống thành phố: tối giản, thực
              dụng và tự tin. Sản phẩm tập trung vào form mặc hằng ngày, chất
              liệu bền và tinh thần local brand Việt Nam.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
