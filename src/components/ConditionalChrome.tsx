"use client";

import { usePathname } from "next/navigation";
import { ReactNode, Suspense } from "react";
import { Navbar } from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DemoBanner } from "@/components/DemoBanner";

interface ConditionalChromeProps {
  children: ReactNode;
  footerSlot: ReactNode;
}

function isAdminPath(pathname: string | null) {
  if (!pathname) return false;
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function ConditionalChrome({ children, footerSlot }: ConditionalChromeProps) {
  const pathname = usePathname();
  const adminRoute = isAdminPath(pathname);

  if (adminRoute) {
    return <main className="min-h-screen flex-1">{children}</main>;
  }

  return (
    <SidebarProvider>
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      <SidebarInset>
        <DemoBanner />
        <Navbar />
        <main className="flex-1">{children}</main>
        {footerSlot}
      </SidebarInset>
    </SidebarProvider>
  );
}
