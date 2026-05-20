import { Suspense } from "react";
import ClientProducts from "@/components/ClientProducts";
import Image from "next/image";

export default function ProductsPage() {
  return (
    <div className="bg-white text-zinc-950">
      <section className="relative overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1800&q=80"
          alt="RESEY streetwear collection"
          width={1800}
          height={720}
          className="h-[320px] w-full object-cover md:h-[460px]"
          priority
        />
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-7xl px-4 pb-10 text-white md:pb-14">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.32em] text-zinc-300">
              NEW DROP / RESEY
            </p>
            <h1 className="max-w-3xl text-4xl font-black uppercase leading-none md:text-6xl">
              Streetwear collection
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-200">
              RESEY identity, modern streetwear. Thiết kế cho chuyển động hằng
              ngày.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-6 px-4 py-10">
        <div className="border-b border-zinc-200 pb-4">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
            Collection
          </p>
          <h2 className="mt-2 text-2xl font-black uppercase">
            Tất cả sản phẩm
          </h2>
        </div>
        <Suspense
          fallback={<div className="py-8 text-sm">Đang tải bộ lọc...</div>}
        >
          <ClientProducts />
        </Suspense>
      </section>
    </div>
  );
}
