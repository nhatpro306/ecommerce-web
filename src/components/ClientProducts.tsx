"use client";

import { motion, AnimatePresence } from "motion/react";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/ProductCard";
import { useProducts, FilterOptions } from "@/hooks/queries";
import { ProductType } from "@/types";
import { ErrorState } from "@/components/ErrorState";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProductFilter } from "@/components/ProductFilter";
import { useState, useMemo } from "react";

// Sort products based on the selected option
const sortProducts = (
  products: ProductType[],
  sortBy: FilterOptions["sortBy"],
) => {
  const sorted = [...products];

  switch (sortBy) {
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

  // Filter by stock (only if not 'all')
  if (filters.stockFilter === "in-stock") {
    filtered = filtered.filter((product) => product.stock > 0);
  } else if (filters.stockFilter === "out-of-stock") {
    filtered = filtered.filter((product) => product.stock === 0);
  }
  // When stockFilter is 'all', show all products regardless of stock

  // Filter by category (only if not 'all')
  if (filters.categoryFilter !== "all") {
    filtered = filtered.filter(
      (product) =>
        String(product.category_id ?? "") === String(filters.categoryFilter),
    );
  }
  // When categoryFilter is 'all', show all categories

  return filtered;
};

export default function ClientProducts() {
  // const { user } = useAuth(); // user is not used in this component
  const {
    data: products = [],
    isLoading: loading,
    error,
    refetch: retry,
  } = useProducts();

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<FilterOptions>({
    sortBy: "default",
    stockFilter: "all",
    categoryFilter: "all",
  });

  // Process products with search, filters, and sorting
  //useMemo is used to memoize the function
  const processedProducts = useMemo(() => {
    if (!products) return [];

    // Start with all products
    let processed = [...products];

    // Apply search filter
    if (searchTerm.trim() !== "") {
      processed = processed.filter(
        (product) =>
          product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (product.description?.toLowerCase() || "").includes(
            searchTerm.toLowerCase(),
          ),
      );
    }

    // Apply filters
    processed = filterProducts(processed, filters);

    // Apply sorting
    processed = sortProducts(processed, filters.sortBy);

    return processed;
  }, [products, searchTerm, filters]);

  const categoryOptions = useMemo(() => {
    const categoryMap = new Map<string, string>();
    products.forEach((product) => {
      if (product.category_id != null) {
        categoryMap.set(
          String(product.category_id),
          product.category?.name || `Category ${product.category_id}`,
        );
      }
    });
    return [
      { value: "all", label: "Tất cả danh mục" },
      ...Array.from(categoryMap.entries()).map(([value, label]) => ({
        value,
        label,
      })),
    ];
  }, [products]);

  return (
    <ErrorBoundary>
      <>
        {/* Search Input */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto w-full max-w-md"
        >
          <Input
            type="text"
            placeholder="Tìm sản phẩm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </motion.div>

        {/* Product Filter */}
        <ProductFilter
          filters={filters}
          onFilterChange={setFilters}
          categoryOptions={categoryOptions}
        />

        {/* Product Count and Reset */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-muted/50 flex flex-col items-center justify-between gap-4 rounded-lg p-4 sm:flex-row"
        >
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <span>
              Hiển thị {processedProducts.length}/{products?.length || 0} sản phẩm
            </span>
          </div>

          {/* Reset Filters Button */}
          {(filters.sortBy !== "default" ||
            filters.stockFilter !== "all" ||
            filters.categoryFilter !== "all" ||
            searchTerm.trim() !== "") && (
            <button
              onClick={() => {
                setFilters({
                  sortBy: "default",
                  stockFilter: "all",
                  categoryFilter: "all",
                });
                setSearchTerm("");
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-3 py-1 text-xs transition-colors"
            >
              Reset bộ lọc
            </button>
          )}
        </motion.div>

        {/* Products grid */}
        <div className="py-4">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex min-h-[200px] items-center justify-center"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="border-primary h-8 w-8 rounded-full border-t-2 border-b-2"
                />
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ErrorState
                  title="Failed to load products"
                  description="Không thể tải danh sách sản phẩm. Vui lòng thử lại."
                  onRetry={retry}
                  error={error}
                  type="network"
                />
              </motion.div>
            ) : processedProducts.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ErrorState
                  title={
                    (products?.length || 0) === 0
                      ? "No products available"
                      : "Không có sản phẩm phù hợp"
                  }
                  description={
                    (products?.length || 0) === 0
                      ? "Hiện chưa có sản phẩm nào."
                      : searchTerm.trim() !== ""
                        ? "Thử từ khóa khác hoặc điều chỉnh bộ lọc."
                        : "Điều chỉnh bộ lọc để xem thêm sản phẩm."
                  }
                  showRetry={false}
                  type="not-found"
                />
                {(products?.length || 0) > 0 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => {
                        setFilters({
                          sortBy: "default",
                          stockFilter: "all",
                          categoryFilter: "all",
                        });
                        setSearchTerm("");
                      }}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-4 py-2 transition-colors"
                    >
                      Xóa toàn bộ bộ lọc
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="products"
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <AnimatePresence>
                  {processedProducts.map((product, index) => (
                    <motion.div
                      key={product.product_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{
                        duration: 0.3,
                        delay: index * 0.1,
                      }}
                    >
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </>
    </ErrorBoundary>
  );
}
