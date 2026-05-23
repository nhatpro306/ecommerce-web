"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Package, Settings, ShoppingCart, Users, User, LogOut, Store } from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/admin/products", label: "Sản phẩm", icon: Package },
  { href: "/admin/orders", label: "Đơn hàng", icon: ShoppingCart },
  { href: "/admin/users", label: "Người dùng", icon: Users },
  { href: "/admin/settings", label: "Cài đặt", icon: Settings },
];

function displayName(user: { email?: string | null; user_metadata?: Record<string, unknown> } | null) {
  const fromMeta =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined);
  return fromMeta || user?.email || "Admin RESEY";
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { isAdmin, loading } = useAdmin();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push("/dashboard");
    }
  }, [isAdmin, loading, router]);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8">
        <div className="border border-rose-200 bg-rose-50 p-4 text-rose-700">
          <p className="text-lg font-bold">{t("admin_no_permission")}</p>
          <Link href="/profile" className="mt-2 inline-block text-sm underline">
            {t("admin_go_profile")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="h-fit border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">RESEY</p>
          <p className="text-base font-black text-zinc-900">Admin Panel</p>
        </div>
        <nav className="p-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="mb-1 flex items-center gap-2 border border-transparent px-3 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-200 hover:bg-zinc-50"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <section className="min-w-0">
        <header className="mb-4 flex items-center justify-between border border-zinc-200 bg-white px-4 py-3">
          <p className="text-sm font-semibold text-zinc-700">RESEY Admin</p>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" className="h-10 rounded-none px-2">
                    <Avatar className="mr-2 h-7 w-7">
                      <AvatarFallback>{(displayName(user).charAt(0) || "A").toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="max-w-[140px] truncate text-xs font-semibold">{displayName(user)}</p>
                      <p className="text-[11px] text-zinc-500">{t("admin_role")}</p>
                    </div>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-56 rounded-none">
                <div className="px-2 py-1.5">
                  <p className="truncate text-sm font-semibold">{displayName(user)}</p>
                  <p className="truncate text-xs text-zinc-500">{user?.email || "admin@resey.uk"}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  {t("admin_profile")}
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/admin/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  {t("admin_store_settings")}
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/")}>
                  <Store className="mr-2 h-4 w-4" />
                  {t("admin_back_storefront")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("admin_signout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        {children}
      </section>
    </div>
  );
}

