import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { productServerService } from "@/services/product/productServerService";

const categories = [
  { label: "Tất cả sản phẩm", href: "/products" },
  { label: "Áo", href: "/products?category=T-Shirts" },
  { label: "Quần", href: "/products?category=Pants" },
  { label: "Phụ kiện", href: "/products?category=Accessories" },
];

export default async function Home() {
  const products = await productServerService.getProducts();
  const featuredProducts = products.slice(0, 8);

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <section className="grid min-h-[78vh] lg:grid-cols-2">
        <div className="flex items-center bg-black px-6 py-16 text-white md:px-12">
          <div className="max-w-xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.35em] text-zinc-400">
              RESEY / Bộ sưu tập mới
            </p>
            <h1 className="text-5xl font-black uppercase leading-none tracking-tight text-white md:text-7xl">
              Phong cách phố.
              <br />
              Dấu ấn riêng.
            </h1>
            <p className="mt-6 max-w-md text-sm leading-7 text-zinc-200">
              RESEY mang đến streetwear hiện đại cho nhịp sống hằng ngày: form dễ mặc,
              chất liệu bền, màu sắc cá tính và tinh thần tự tin của thế hệ trẻ.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products?sort=latest">
                <Button className="h-12 cursor-pointer rounded-none bg-white px-7 text-xs font-bold uppercase tracking-[0.18em] text-zinc-950 hover:bg-zinc-200">
                  Mua hàng mới
                </Button>
              </Link>
              <Link href="/products">
                <Button
                  variant="outline"
                  className="h-12 cursor-pointer rounded-none border-white bg-transparent px-7 text-xs font-bold uppercase tracking-[0.18em] text-white hover:bg-white hover:text-black active:bg-white active:text-black"
                >
                  Xem bộ sưu tập
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="relative min-h-[420px]">
          <Image
            src="/images/hero-resey.jpg"
            alt="Chiến dịch streetwear RESEY"
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
              Hàng mới về
            </p>
            <h2 className="mt-2 text-2xl font-black uppercase">
              Sản phẩm nổi bật
            </h2>
          </div>
          <Link
            href="/products"
            className="text-xs font-bold uppercase tracking-[0.16em] underline underline-offset-4"
          >
            Xem tất cả
          </Link>
        </div>

        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.product_id} product={product} />
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-zinc-300 bg-white p-8 text-sm font-medium text-zinc-700">
            Hi?n ch?a c? s?n ph?m n?i b?t. Vui l?ng quay l?i sau ho?c v?o trang s?n ph?m ?? ki?m tra b? s?u t?p m?i nh?t.
          </div>
        )}
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-14 md:grid-cols-2">
        <div className="relative min-h-[360px] overflow-hidden bg-zinc-100">
          <Image
            src="/images/brand-story.jpg"
            alt="Chi tiết sản phẩm RESEY"
            fill
            className="object-cover"
          />
        </div>
        <div className="flex items-center border border-zinc-200 p-8 md:p-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
              Câu chuyện thương hiệu
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase">
              RESEY: bản sắc đường phố, tinh thần hiện đại.
            </h2>
            <p className="mt-5 leading-7 text-zinc-600">
              RESEY lấy cảm hứng từ nhịp sống thành phố và văn hóa local brand Việt Nam.
              Mỗi sản phẩm tập trung vào form mặc hằng ngày, chất liệu bền và chi tiết đủ
              nổi bật để bạn tự tin xuất hiện ở bất kỳ đâu.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
