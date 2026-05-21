import Image from "next/image";
import ClientProducts from "@/components/ClientProducts";
import { productServerService } from "@/services/product/productServerService";

type ProductsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = (await searchParams) || {};
  const products = await productServerService.getProducts();

  return (
    <div className="bg-white text-zinc-950">
      <section className="relative overflow-hidden">
        <Image
          src="/images/hero-resey.jpg"
          alt="Bộ sưu tập streetwear RESEY"
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
              Bộ sưu tập streetwear
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-200">
              Bản sắc RESEY, streetwear hiện đại. Thiết kế cho chuyển động hằng ngày.
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
        <ClientProducts
          initialProducts={products}
          initialQuery={firstParam(params.q) || ""}
          initialCategory={firstParam(params.category) || "all"}
          initialSize={firstParam(params.size) || "all"}
          initialColor={firstParam(params.color) || "all"}
          initialSort={firstParam(params.sort) || "default"}
          initialStock={firstParam(params.stock) || "all"}
        />
      </section>
    </div>
  );
}
