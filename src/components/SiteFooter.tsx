import Image from "next/image";
import Link from "next/link";

const policies: { label: string; href: string }[] = [
  { label: "Về RESEY", href: "/about" },
  { label: "Liên hệ", href: "/contact" },
  { label: "Hướng dẫn mua hàng", href: "/payment-guide" },
  { label: "Chính sách giao nhận", href: "/shipping-policy" },
  { label: "Chính sách đổi trả", href: "/return-policy" },
  { label: "Hướng dẫn chọn size", href: "/size-guide" },
  { label: "Bảo mật thông tin", href: "/privacy-policy" },
];

const benefits: [string, string][] = [
  ["Giao hàng toàn quốc", "COD / chuyển khoản"],
  ["Hỗ trợ nhanh", "qua email và mạng xã hội"],
  ["Đổi trả linh hoạt", "theo chính sách RESEY"],
  ["Local brand Việt", "thiết kế cho nhịp sống phố"],
];

const stores: string[] = ["Cửa hàng online chính thức"];

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
            <Image
              src="/brand/resey-logo.jpg"
              alt="Logo RESEY"
              width={130}
              height={90}
              className="h-20 w-auto object-contain"
            />

            <p className="mt-4 max-w-md text-sm leading-6 text-zinc-600">
              RESEY là local brand streetwear Việt Nam dành cho nhịp sống hằng ngày:
              tối giản, dễ phối, form thoải mái và đủ cá tính để tạo dấu ấn riêng.
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
                <li key={policy.href}>
                  <Link
                    href={policy.href}
                    className="transition hover:text-zinc-950"
                  >
                    {policy.label}
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

