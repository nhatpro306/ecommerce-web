"use client";

import { ShoppingCart, User, LogIn, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

const navItems = [
  { href: "/products?sort=latest", label: "new arrivals" },
  { href: "/products?sort=price-desc", label: "best-selling items" },
  { href: "/products?category=T-Shirts", label: "tops" },
  { href: "/products?category=Pants", label: "bottoms" },
  { href: "/products?category=Hoodies", label: "outerwear" },
  { href: "/products?category=Accessories", label: "accessories" },
  { href: "/products", label: "sale" },
];

export function Navbar() {
  const { totalItems } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3 lg:hidden">
          <SidebarTrigger className="hover:bg-zinc-100" />
        </div>

        <nav className="hidden flex-1 items-center gap-5 lg:flex">
          {navItems.slice(0, 4).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-700 transition hover:text-zinc-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link href="/" className="flex flex-col items-center">
          <span className="text-2xl font-black tracking-[0.18em] text-zinc-950">
            SAIGON
          </span>
          <span className="-mt-1 text-[10px] font-semibold uppercase tracking-[0.45em] text-zinc-500">
            local
          </span>
        </Link>

        <nav className="hidden flex-1 items-center justify-end gap-5 lg:flex">
          {navItems.slice(4).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-700 transition hover:text-zinc-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-2 flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-9 w-9 cursor-pointer sm:inline-flex"
            onClick={() => router.push("/products")}
          >
            <Search className="h-[1.1rem] w-[1.1rem]" />
            <span className="sr-only">Search products</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 cursor-pointer"
            onClick={() => router.push(user ? "/profile" : "/signin")}
          >
            {user ? (
              <User className="h-[1.1rem] w-[1.1rem]" />
            ) : (
              <LogIn className="h-[1.1rem] w-[1.1rem]" />
            )}
            <span className="sr-only">{user ? "Profile" : "Sign in"}</span>
          </Button>

          <Link href="/cart">
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 cursor-pointer"
            >
              <ShoppingCart className="h-[1.1rem] w-[1.1rem]" />
              {totalItems > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-950 text-[10px] font-bold text-white">
                  {totalItems}
                </span>
              )}
              <span className="sr-only">Shopping cart</span>
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
