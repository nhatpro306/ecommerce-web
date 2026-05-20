"use client";

import { motion } from "motion/react";
import { Filter, SortAsc } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterOptions } from "@/hooks/queries";

interface ProductFilterProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  categoryOptions?: Array<{ value: string; label: string }>;
}

const sortOptions = [
  { value: "default", label: "Mặc định" },
  { value: "price-asc", label: "Giá tăng dần" },
  { value: "price-desc", label: "Giá giảm dần" },
  { value: "name-asc", label: "Tên A-Z" },
  { value: "name-desc", label: "Tên Z-A" },
];

const stockOptions = [
  { value: "all", label: "Tất cả sản phẩm" },
  { value: "in-stock", label: "Còn hàng" },
  { value: "out-of-stock", label: "Hết hàng" },
];

export function ProductFilter({
  filters,
  onFilterChange,
  categoryOptions = [{ value: "all", label: "Tất cả danh mục" }],
}: ProductFilterProps) {
  const handleSortChange = (value: string | null) => {
    if (value == null) return;
    onFilterChange({
      ...filters,
      sortBy: value as FilterOptions["sortBy"],
    });
  };

  const handleStockChange = (value: string | null) => {
    if (value == null) return;
    onFilterChange({
      ...filters,
      stockFilter: value as FilterOptions["stockFilter"],
    });
  };

  const handleCategoryChange = (value: string | null) => {
    if (value == null) return;
    onFilterChange({
      ...filters,
      categoryFilter: value as FilterOptions["categoryFilter"],
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-card flex flex-col gap-4 rounded-lg border p-4 sm:flex-row"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <Filter className="h-4 w-4" />
        <span>Bộ lọc:</span>
      </div>

      <div className="flex flex-1 flex-col gap-4 sm:flex-row">
        {/* Sort Options */}
        <div className="flex flex-col gap-2">
          <label className="text-muted-foreground text-xs font-medium">
            Sắp xếp
          </label>
          <Select value={filters.sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SortAsc className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Sắp xếp" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stock Filter */}
        <div className="flex flex-col gap-2">
          <label className="text-muted-foreground text-xs font-medium">
            Tồn kho
          </label>
          <Select value={filters.stockFilter} onValueChange={handleStockChange}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Tồn kho" />
            </SelectTrigger>
            <SelectContent>
              {stockOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category Filter */}
        <div className="flex flex-col gap-2">
          <label className="text-muted-foreground text-xs font-medium">
            Danh mục
          </label>
          <Select
            value={filters.categoryFilter}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Danh mục" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </motion.div>
  );
}
