"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { AnimatePresence } from "motion/react";
import {
  Home,
  Shirt,
  Watch,
  Smartphone,
  Search,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useCategories } from "@/hooks/queries";
import { usePathname, useSearchParams } from "next/navigation";
import { Motion } from "@/components/motion/motion";
import {
  contentVariants,
  staggerVariants,
  itemVariants,
  searchVariants,
  indicatorVariants,
} from "@/components/motion/animation-variants";

const categoryIcons: Record<string, React.ElementType> = {
  "T-Shirts": Shirt,
  Hoodies: Shirt,
  Pants: Shirt,
  Accessories: Watch,
};

function categoryHref(name: string) {
  return `/products?category=${encodeURIComponent(name)}`;
}

const FALLBACK_CATEGORY_ITEMS = [
  { name: "Tất cả", icon: Home, href: "/products" },
  { name: "T-Shirts", icon: Shirt, href: categoryHref("T-Shirts") },
  { name: "Hoodies", icon: Shirt, href: categoryHref("Hoodies") },
  { name: "Pants", icon: Shirt, href: categoryHref("Pants") },
  { name: "Accessories", icon: Watch, href: categoryHref("Accessories") },
];

export default function Sidebar() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");
  const { state } = useSidebar();

  // Use the TanStack Query hook instead of manual state management
  const { data: categories, isLoading: loading } = useCategories();

  const isCollapsed = state === "collapsed";

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  // Use DB categories when available, fall back to hardcoded list while loading or on error
  const categoryItems =
    categories && categories.length > 0
      ? [
          { name: "Tất cả", icon: Home, href: "/products" },
          ...categories.map((category) => ({
            name: category.name,
            icon: categoryIcons[category.name] || Smartphone,
            href: categoryHref(category.name),
          })),
        ]
      : FALLBACK_CATEGORY_ITEMS;

  // Public sidebar shows every storefront category to every visitor.
  const displayCategories = categoryItems;

  return (
    <ShadcnSidebar collapsible="icon" className="z-[70] border-r">
      {/* Header with logo */}
      <SidebarHeader>
        <div className="flex items-center justify-between">
          <Motion
            variants={contentVariants}
            initial={isCollapsed ? "closed" : "open"}
            animate={isCollapsed ? "closed" : "open"}
            className="flex items-center space-x-2.5"
          >
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-white">
              <Image
                src="/brand/resey-logo.jpg"
                alt="Logo RESEY"
                width={36}
                height={36}
                className="h-full w-full object-contain"
              />
            </div>
            {!isCollapsed && (
              <Motion
                variants={itemVariants}
                initial="closed"
                animate="open"
                className="flex flex-col"
              >
                <span className="text-foreground text-base font-semibold">
                  RESEY
                </span>
                <span className="text-muted-foreground text-xs">
                  Local Streetwear
                </span>
              </Motion>
            )}
          </Motion>

          {!isCollapsed && (
            <SidebarTrigger className="hover:bg-muted/50 ml-auto transition-colors duration-200" />
          )}
        </div>
      </SidebarHeader>

      {/* Search Bar */}
      <div className="px-3">
        <AnimatePresence>
          {!isCollapsed && (
            <Motion
              variants={searchVariants}
              initial="closed"
              animate="open"
              exit="closed"
              transition={{ duration: 0.3 }}
              className="pb-2"
            >
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                <Input
                  type="text"
                  placeholder="Tìm sản phẩm..."
                  className="bg-muted/50 border-border/50 focus:bg-background w-full pl-9 text-sm transition-all duration-200"
                />
              </div>
            </Motion>
          )}
        </AnimatePresence>
      </div>

      <SidebarContent>
        <Motion
          variants={staggerVariants}
          initial="closed"
          animate={isCollapsed ? "closed" : "open"}
          className="space-y-4"
        >
          {/* Categories Navigation */}
          <SidebarGroup>
            {!isCollapsed && (
              <Motion variants={itemVariants} initial="closed" animate="open">
                <SidebarGroupLabel className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase">
                  Danh mục
                  {loading && (
                    <Loader2 className="h-3 w-3 animate-spin opacity-50" />
                  )}
                </SidebarGroupLabel>
              </Motion>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                <Motion
                  variants={staggerVariants}
                  initial="closed"
                  animate="open"
                >
                  {displayCategories.map((category) => {
                    const isAllCategory = category.name === "Tất cả";
                    const onProductsPage = pathname === "/products";
                    const isActive = isAllCategory
                      ? onProductsPage && !activeCategory
                      : onProductsPage && activeCategory === category.name;
                    const Icon = category.icon;

                    return (
                      <Motion
                        key={category.name}
                        variants={itemVariants}
                        initial="closed"
                        animate="open"
                      >
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            render={<Link href={category.href} />}
                            isActive={isActive}
                            className={cn(
                              "group relative transition-all duration-200",
                              isActive
                                ? "bg-primary/10 text-primary border-primary/20 border"
                                : "hover:translate-x-1",
                            )}
                            tooltip={category.name}
                          >
                            <Icon
                              className={cn(
                                "h-4 w-4 transition-all duration-200",
                                isActive
                                  ? "text-primary"
                                  : "text-muted-foreground group-hover:text-foreground",
                              )}
                            />
                            {!isCollapsed && (
                              <span className="text-sm font-medium">
                                {category.name}
                              </span>
                            )}
                            {isActive && (
                              <Motion
                                variants={indicatorVariants}
                                initial="closed"
                                animate="open"
                                transition={{
                                  type: "spring",
                                  stiffness: 500,
                                  damping: 30,
                                }}
                                className="bg-primary absolute right-2 h-2 w-2 rounded-full"
                              />
                            )}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </Motion>
                    );
                  })}
                </Motion>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </Motion>
      </SidebarContent>

      <SidebarRail />
    </ShadcnSidebar>
  );
}
