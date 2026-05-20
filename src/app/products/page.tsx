import ClientProducts from "@/components/ClientProducts";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProductsPage() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      <section className="relative overflow-hidden rounded-2xl">
        <Image
          src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1600&q=80"
          alt="Vietnamese streetwear collection"
          width={1600}
          height={700}
          className="h-[300px] w-full object-cover md:h-[380px]"
          priority
        />
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 flex items-end p-6 md:p-10">
          <div className="max-w-2xl text-white">
            <p className="mb-2 text-xs tracking-[0.3em] md:text-sm">NEW DROP</p>
            <h1 className="text-2xl font-bold leading-tight md:text-4xl">
              SAIGON LOCAL STREETWEAR
            </h1>
            <p className="mt-2 text-sm text-zinc-200 md:text-base">
              Local identity, modern streetwear. Thiết kế cho chuyển động hằng ngày.
            </p>
            <div className="mt-4">
              <Link href="/checkout">
                <Button className="cursor-pointer bg-white text-zinc-900 hover:bg-zinc-200">
                  Mua ngay
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <h2 className="text-2xl font-bold">Bộ sưu tập sản phẩm</h2>
      <ClientProducts />
    </div>
  );
}
