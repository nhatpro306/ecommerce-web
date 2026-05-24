"use client";

import Image from "next/image";
import { ShoppingCart, User, LogIn, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";

const navItems = [
  { href: "/", key: "nav_home" },
  { href: "/products", key: "nav_products" },
  { href: "/products?sort=latest", key: "nav_collection" },
  { href: "/about", key: "nav_about" },
  { href: "/contact", key: "nav_contact" },
];

export function Navbar() {
  const { totalItems } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 text-black backdrop-blur">
      <div className="mx-auto flex h-[88px] max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3 lg:hidden">
          <SidebarTrigger className="text-black hover:bg-zinc-100 hover:text-black" />
        </div>

        <nav className="hidden flex-1 items-center gap-5 lg:flex">
          {navItems.slice(0, 3).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-700 transition hover:text-zinc-950"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <Link href="/" className="flex items-center justify-center">
          <Image
            src="/brand/resey-logo.jpg"
            alt="Logo RESEY"
            width={92}
            height={56}
            priority
            className="h-16 w-auto object-contain"
          />
        </Link>

        <nav className="hidden flex-1 items-center justify-end gap-5 lg:flex">
          {navItems.slice(3).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-700 transition hover:text-zinc-950"
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="ml-2 flex items-center justify-end gap-1">
          <LanguageSwitcher />
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-9 w-9 cursor-pointer text-black hover:bg-zinc-100 hover:text-black active:bg-zinc-200 sm:inline-flex"
            onClick={() => router.push("/products")}
          >
            <Search className="h-[1.1rem] w-[1.1rem]" />
            <span className="sr-only">{t("nav_search")}</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 cursor-pointer text-black hover:bg-zinc-100 hover:text-black active:bg-zinc-200"
            onClick={() => router.push("/cart")}
          >
            <div className="relative">
              <ShoppingCart className="h-[1.1rem] w-[1.1rem]" />
              {totalItems > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-950 text-[10px] font-bold text-white">
                  {totalItems}
                </span>
              )}
            </div>
            <span className="sr-only">{t("nav_cart")}</span>
          </Button>

          {user ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 cursor-pointer text-black hover:bg-zinc-100 hover:text-black active:bg-zinc-200"
              onClick={() => router.push("/profile")}
            >
              <User className="h-[1.1rem] w-[1.1rem]" />
              <span className="sr-only">{t("nav_account")}</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 cursor-pointer text-black hover:bg-zinc-100 hover:text-black active:bg-zinc-200"
              onClick={() => router.push("/signin")}
            >
              <LogIn className="h-[1.1rem] w-[1.1rem]" />
              <span className="sr-only">{t("nav_signin")}</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
