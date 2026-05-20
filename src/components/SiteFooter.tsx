import Link from "next/link";

const policies: string[] = [
  "Hướng dẫn mua hàng",
  "Chính sách đổi trả",
  "Chính sách giao nhận",
  "Hướng dẫn bảo quản sản phẩm",
];

const benefits: [string, string][] = [
  ["Giao hàng miễn phí", "với mọi đơn hàng"],
  ["Hỗ trợ 24/7", "online / offline"],
  ["Đổi trả linh hoạt", "trong vòng 7 ngày"],
  ["Đặt hàng trực tuyến", "COD / chuyển khoản"],
];

const stores: string[] = ["Online store only"];

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <section className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-8 md:grid-cols-4">
        {benefits.map(([title, desc]) => (
          <div key={title} className="border border-zinc-200 p-5 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.16em]">
              {title}
            </p>
            <p className="mt-1 text-xs text-zinc-500">{desc}</p>
          </div>
        ))}
      </section>

      <div className="border-t border-zinc-200">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <h2 className="text-3xl font-black tracking-[0.16em]">RESEY</h2>

            <p className="mt-4 max-w-md text-sm leading-6 text-zinc-600">
              Vietnamese local streetwear built for daily movement. Minimal
              silhouettes, confident graphics, and practical fits for the city.
            </p>

            <div className="mt-4 space-y-1 text-sm text-zinc-600">
              <p>Hotline: +81 90-xxxx-xxxx</p>
              <p>Email: supermanzero30@gmail.com</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.18em]">
              Chính sách
            </h3>

            <ul className="mt-4 space-y-2 text-sm text-zinc-600">
              {policies.map((policy) => (
                <li key={policy}>
                  <Link
                    href="/products"
                    className="transition hover:text-zinc-950"
                  >
                    {policy}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.18em]">
              Hệ thống cửa hàng
            </h3>

            <ul className="mt-4 space-y-2 text-sm text-zinc-600">
              {stores.map((store) => (
                <li key={store}>{store}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-200 px-4 py-4 text-center text-xs uppercase tracking-[0.18em] text-zinc-500">
        Copyright © 2026 RESEY
      </div>
    </footer>
  );
}