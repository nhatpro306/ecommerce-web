import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { createPublicServerSupabase } from "@/lib/supabase/public-server";
import { productServerService } from "@/services/product/productServerService";
import type { StoreSettingsType } from "@/types";

export default async function Home() {
  const supabase = createPublicServerSupabase();
  const { data } = await supabase
    .from("store_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  const settings = (data || {}) as StoreSettingsType;

  const products = await productServerService.getProducts();
  const featuredProducts = products.slice(0, 8);

  const { data: dbCategories } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");

  const categoryLinks = [
    { label: "Tất cả sản phẩm", href: "/products" },
    ...((dbCategories || []) as { id: number; name: string }[]).map((cat) => ({
      label: cat.name,
      href: `/products?category=${encodeURIComponent(cat.name)}`,
    })),
  ];

  const heroBadge = settings.hero_badge_text || "RESEY / Bộ sưu tập mới";
  const heroTitle = settings.hero_title || "PHONG CÁCH PHỐ";
  const heroTitleLine2 = settings.slogan || "Dấu ấn riêng.";
  const heroSubtitle =
    settings.hero_subtitle ||
    "RESEY mang đến streetwear hiện đại cho nhịp sống hằng ngày: form dễ mặc, chất liệu bền, màu sắc cá tính và tinh thần tự tin của thế hệ trẻ.";
  const heroImage = settings.hero_image_url || "/images/hero-resey.jpg";
  const heroPrimaryText = settings.hero_primary_button_text || "Mua hàng mới";
  const heroPrimaryUrl = settings.hero_primary_button_url || "/products?sort=latest";
  const heroSecondaryText = settings.hero_secondary_button_text || "Xem bộ sưu tập";
  const heroSecondaryUrl = settings.hero_secondary_button_url || "/products";
  const storyTitle = settings.story_title || "RESEY: bản sắc đường phố tinh thần hiện đại.";
  const storyDescription =
    settings.story_description ||
    "RESEY lấy cảm hứng từ nhịp sống thành phố và văn hóa local brand Việt Nam. Mỗi sản phẩm tập trung vào form mặc hằng ngày, chất liệu bền và chi tiết đủ nổi bật để bạn tự tin xuất hiện ở bất kể đâu.";

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      {settings.announcement_text && (
        <div className="border-y border-zinc-200 bg-zinc-50 px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.14em] text-zinc-700">
          {settings.announcement_text}
        </div>
      )}

      <section className="grid min-h-[78vh] lg:grid-cols-2">
        <div className="flex items-center bg-black px-6 py-16 text-white md:px-12">
          <div className="max-w-xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.35em] text-zinc-400">
              {heroBadge}
            </p>
            <h1 className="text-5xl font-black uppercase leading-none tracking-tight text-white md:text-7xl">
              {heroTitle}
              <br />
              {heroTitleLine2}
            </h1>
            <p className="mt-6 max-w-md text-sm leading-7 text-zinc-200">{heroSubtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={heroPrimaryUrl}>
                <Button className="h-12 cursor-pointer rounded-none bg-white px-7 text-xs font-bold uppercase tracking-[0.18em] text-zinc-950 hover:bg-zinc-200">
                  {heroPrimaryText}
                </Button>
              </Link>
              <Link href={heroSecondaryUrl}>
                <Button
                  variant="outline"
                  className="h-12 cursor-pointer rounded-none border-white bg-transparent px-7 text-xs font-bold uppercase tracking-[0.18em] text-white hover:bg-white hover:text-black active:bg-white active:text-black"
                >
                  {heroSecondaryText}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="relative min-h-[420px]">
          <Image src={heroImage} alt="Chiến dịch streetwear RESEY" fill priority className="object-cover" />
          <div className="absolute inset-0 bg-black/10" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {categoryLinks.map((category) => (
            <Link
              key={category.href}
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
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Hàng mới về</p>
            <h2 className="mt-2 text-2xl font-black uppercase">Sản phẩm nổi bật</h2>
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
            Hiện chưa có sản phẩm nổi bật.
          </div>
        )}
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-14 md:grid-cols-2">
        <div className="relative min-h-[360px] overflow-hidden bg-zinc-100">
          <Image src="/images/brand-story.jpg" alt="Chi tiết sản phẩm RESEY" fill className="object-cover" />
        </div>
        <div className="flex items-center border border-zinc-200 p-8 md:p-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Câu chuyện thương hiệu</p>
            <h2 className="mt-3 text-3xl font-black uppercase">{storyTitle}</h2>
            <p className="mt-5 leading-7 text-zinc-600">{storyDescription}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
