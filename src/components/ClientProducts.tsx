"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/ProductCard";
import { ProductFilter } from "@/components/ProductFilter";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ErrorState } from "@/components/ErrorState";
import { FilterOptions, useProducts } from "@/hooks/queries";
import { useI18n } from "@/lib/i18n";
import { ProductType } from "@/types";
import { getSellableStock } from "@/utils/productVisibility";

const DEFAULT_FILTERS: FilterOptions = {
  sortBy: "default",
  stockFilter: "all",
  categoryFilter: "all",
  sizeFilter: "all",
  colorFilter: "all",
};

interface ClientProductsProps {
  initialProducts?: ProductType[];
  initialQuery?: string;
  initialCategory?: string;
  initialSize?: string;
  initialColor?: string;
  initialSort?: string;
  initialStock?: string;
}

const isValidSort = (value: string | null | undefined): value is FilterOptions["sortBy"] =>
  ["default", "latest", "price-asc", "price-desc", "name-asc", "name-desc"].includes(
    value || "",
  );

const isValidStock = (
  value: string | null | undefined,
): value is FilterOptions["stockFilter"] =>
  ["all", "in-stock", "out-of-stock"].includes(value || "");

const sortProducts = (
  products: ProductType[],
  sortBy: FilterOptions["sortBy"],
) => {
  const sorted = [...products];

  switch (sortBy) {
    case "latest":
      return sorted.sort((a, b) => {
        const first = a.created_at ? new Date(a.created_at).getTime() : 0;
        const second = b.created_at ? new Date(b.created_at).getTime() : 0;
        return second - first;
      });
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price);
    case "name-asc":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "name-desc":
      return sorted.sort((a, b) => b.title.localeCompare(a.title));
    default:
      return sorted;
  }
};

const filterProducts = (products: ProductType[], filters: FilterOptions) => {
  let filtered = [...products];

  if (filters.stockFilter === "in-stock") {
    filtered = filtered.filter((product) => getSellableStock(product) > 0);
  } else if (filters.stockFilter === "out-of-stock") {
    filtered = filtered.filter((product) => getSellableStock(product) === 0);
  }

  if (filters.categoryFilter !== "all") {
    filtered = filtered.filter(
      (product) =>
        String(product.category_id ?? "") === String(filters.categoryFilter) ||
        product.category?.name === filters.categoryFilter,
    );
  }

  if (filters.sizeFilter !== "all") {
    filtered = filtered.filter((product) =>
      (product.sizes || []).includes(filters.sizeFilter),
    );
  }

  if (filters.colorFilter !== "all") {
    filtered = filtered.filter((product) =>
      (product.colors || []).includes(filters.colorFilter),
    );
  }

  return filtered;
};

export default function ClientProducts({
  initialProducts = [],
  initialQuery = "",
  initialCategory = "all",
  initialSize = "all",
  initialColor = "all",
  initialSort = "default",
  initialStock = "all",
}: ClientProductsProps) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const {
    data: queriedProducts = initialProducts,
    isLoading,
    isFetching,
    error,
    refetch: retry,
  } = useProducts({ initialData: initialProducts });

  const products =
    error && initialProducts.length > 0
      ? initialProducts
      : queriedProducts.length > 0
        ? queriedProducts
        : initialProducts;
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [filters, setFilters] = useState<FilterOptions>({
    sortBy: isValidSort(initialSort) ? initialSort : DEFAULT_FILTERS.sortBy,
    stockFilter: isValidStock(initialStock) ? initialStock : DEFAULT_FILTERS.stockFilter,
    categoryFilter: initialCategory || DEFAULT_FILTERS.categoryFilter,
    sizeFilter: initialSize || DEFAULT_FILTERS.sizeFilter,
    colorFilter: initialColor || DEFAULT_FILTERS.colorFilter,
  });

  useEffect(() => {
    const nextParams = new URLSearchParams();

    if (searchTerm.trim()) nextParams.set("q", searchTerm.trim());
    if (filters.sortBy !== "default") nextParams.set("sort", filters.sortBy);
    if (filters.stockFilter !== "all") nextParams.set("stock", filters.stockFilter);
    if (filters.categoryFilter !== "all") nextParams.set("category", filters.categoryFilter);
    if (filters.sizeFilter !== "all") nextParams.set("size", filters.sizeFilter);
    if (filters.colorFilter !== "all") nextParams.set("color", filters.colorFilter);

    const nextUrl = nextParams.toString()
      ? `${pathname}?${nextParams.toString()}`
      : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [filters, pathname, router, searchTerm]);

  const processedProducts = useMemo(() => {
    let processed = [...products];

    if (searchTerm.trim() !== "") {
      const normalizedSearch = searchTerm.toLowerCase();
      processed = processed.filter(
        (product) =>
          product.title.toLowerCase().includes(normalizedSearch) ||
          (product.description?.toLowerCase() || "").includes(normalizedSearch),
      );
    }

    processed = filterProducts(processed, filters);
    return sortProducts(processed, filters.sortBy);
  }, [products, searchTerm, filters]);

  const categoryOptions = useMemo(() => {
    const categoryMap = new Map<string, string>([
      ["T-Shirts", "Áo thun"],
      ["Hoodies", "Hoodie"],
      ["Pants", "Quần"],
      ["Accessories", "Phụ kiện"],
    ]);

    products.forEach((product) => {
      if (product.category_id != null) {
        categoryMap.set(
          String(product.category_id),
          product.category?.name || `Danh mục ${product.category_id}`,
        );
      }
    });

    return [
      { value: "all", label: t("clientProducts.allCategories") },
      ...Array.from(categoryMap.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [products, t]);

  const sizeOptions = useMemo(() => {
    const sizes = new Set<string>(["S", "M", "L", "XL"]);
    products.forEach((product) => {
      product.sizes?.forEach((size) => sizes.add(size));
    });

    return [
      { value: "all", label: t("clientProducts.allSizes") },
      ...Array.from(sizes).map((size) => ({ value: size, label: size })),
    ];
  }, [products, t]);

  const colorOptions = useMemo(() => {
    const colors = new Set<string>(["Black", "White", "Gray", "Beige"]);
    products.forEach((product) => {
      product.colors?.forEach((color) => colors.add(color));
    });

    return [
      { value: "all", label: t("clientProducts.allColors") },
      ...Array.from(colors).map((color) => ({ value: color, label: color })),
    ];
  }, [products, t]);

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchTerm("");
  };

  const hasActiveFilters =
    filters.sortBy !== "default" ||
    filters.stockFilter !== "all" ||
    filters.categoryFilter !== "all" ||
    filters.sizeFilter !== "all" ||
    filters.colorFilter !== "all" ||
    searchTerm.trim() !== "";

  const showLoading = isLoading && products.length === 0;

  return (
    <ErrorBoundary>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto w-full max-w-md"
      >
        <Input
          type="text"
          placeholder={t("clientProducts.searchPlaceholder")}
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="h-12 rounded-none border-zinc-300 text-center text-sm"
        />
      </motion.div>

      <ProductFilter
        filters={filters}
        onFilterChange={setFilters}
        categoryOptions={categoryOptions}
        sizeOptions={sizeOptions}
        colorOptions={colorOptions}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-between gap-4 border-y border-zinc-200 py-4 sm:flex-row"
      >
        <div className="text-sm text-zinc-500">
          {t("clientProducts.showing", undefined, { shown: processedProducts.length, total: products.length })}
          {isFetching && products.length > 0 ? ` · ${t("clientProducts.updating")}` : ""}
        </div>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="bg-zinc-950 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-zinc-800"
          >
            {t("clientProducts.clearFilters")}
          </button>
        )}
      </motion.div>

      <div className="py-4">
        <AnimatePresence mode="wait">
          {showLoading ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-[200px] items-center justify-center text-sm text-zinc-500"
            >
              {t("clientProducts.loadingProducts")}
            </motion.div>
          ) : error && products.length === 0 ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ErrorState
                title={t("clientProducts.loadFailTitle")}
                description={t("clientProducts.loadFailDesc")}
                onRetry={retry}
                error={error}
                type="network"
              />
            </motion.div>
          ) : processedProducts.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ErrorState
                title={products.length === 0 ? t("clientProducts.emptyTitle") : t("clientProducts.noMatchTitle")}
                description={
                  products.length === 0
                    ? t("clientProducts.emptyDesc")
                    : t("clientProducts.noMatchDesc")
                }
                showRetry={false}
                type="not-found"
              />
              {products.length > 0 && (
                <div className="mt-4 text-center">
                  <button
                    onClick={resetFilters}
                    className="bg-zinc-950 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white"
                  >
                    {t("clientProducts.clearAllFilters")}
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="products"
              className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {processedProducts.map((product, index) => (
                <motion.div
                  key={product.product_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.04 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}
