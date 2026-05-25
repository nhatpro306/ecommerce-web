"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Users,
  User,
  LogOut,
  Store,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
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
import { useAdminSession } from "./AdminSessionContext";

const navItems = [
  { href: "/admin", labelKey: "admin.overview", icon: LayoutDashboard },
  { href: "/admin/products", labelKey: "admin.products", icon: Package },
  { href: "/admin/orders", labelKey: "admin.orders", icon: ShoppingCart },
  { href: "/admin/users", labelKey: "admin.users", icon: Users },
  { href: "/admin/settings", labelKey: "admin.settings", icon: Settings },
];

export default function AdminShellClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { t } = useI18n();
  const { adminEmail } = useAdminSession();
  const displayName = adminEmail ? adminEmail.split("@")[0] : "Admin RESEY";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/signin");
    router.refresh();
  };

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="h-fit border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">RESEY</p>
          <p className="text-base font-black text-zinc-900">{t("admin.panel")}</p>
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
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>
      </aside>

      <section className="min-w-0">
        <header className="mb-4 flex items-center justify-between border border-zinc-200 bg-white px-4 py-3">
          <p className="text-sm font-semibold text-zinc-700">{t("admin.title")}</p>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" className="h-10 rounded-none px-2">
                    <Avatar className="mr-2 h-7 w-7">
                      <AvatarFallback>{(displayName.charAt(0) || "A").toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="max-w-[140px] truncate text-xs font-semibold">{displayName}</p>
                      <p className="text-[11px] text-zinc-500">{t("admin.role")}</p>
                    </div>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-56 rounded-none">
                <div className="px-2 py-1.5">
                  <p className="truncate text-sm font-semibold">{displayName}</p>
                  <p className="truncate text-xs text-zinc-500">{adminEmail || "admin@resey.uk"}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  {t("admin.profile")}
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/admin/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  {t("admin.storeSettings")}
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/")}>
                  <Store className="mr-2 h-4 w-4" />
                  {t("admin.backStorefront")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("nav.signOut")}
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
