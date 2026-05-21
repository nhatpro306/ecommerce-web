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
  sizeOptions?: Array<{ value: string; label: string }>;
  colorOptions?: Array<{ value: string; label: string }>;
}

const sortOptions = [
  { value: "default", label: "Mặc định" },
  { value: "latest", label: "Mới nhất" },
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
  sizeOptions = [{ value: "all", label: "Tất cả size" }],
  colorOptions = [{ value: "all", label: "Tất cả màu" }],
}: ProductFilterProps) {
  const updateFilter = <Key extends keyof FilterOptions>(
    key: Key,
    value: FilterOptions[Key],
  ) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-card grid gap-4 rounded-lg border p-4 md:grid-cols-[auto_1fr]"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <Filter className="h-4 w-4" />
        <span>Bộ lọc</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex flex-col gap-2">
          <label className="text-muted-foreground text-xs font-medium">
            Sắp xếp
          </label>
          <Select
            value={filters.sortBy}
            onValueChange={(value) =>
              updateFilter("sortBy", value as FilterOptions["sortBy"])
            }
          >
            <SelectTrigger className="w-full">
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

        <div className="flex flex-col gap-2">
          <label className="text-muted-foreground text-xs font-medium">
            Tồn kho
          </label>
          <Select
            value={filters.stockFilter}
            onValueChange={(value) =>
              updateFilter("stockFilter", value as FilterOptions["stockFilter"])
            }
          >
            <SelectTrigger className="w-full">
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

        <div className="flex flex-col gap-2">
          <label className="text-muted-foreground text-xs font-medium">
            Danh mục
          </label>
          <Select
            value={filters.categoryFilter}
            onValueChange={(value) => {
              if (value) updateFilter("categoryFilter", value);
            }}
          >
            <SelectTrigger className="w-full">
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

        <div className="flex flex-col gap-2">
          <label className="text-muted-foreground text-xs font-medium">Size</label>
          <Select
            value={filters.sizeFilter}
            onValueChange={(value) => {
              if (value) updateFilter("sizeFilter", value);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              {sizeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-muted-foreground text-xs font-medium">Màu</label>
          <Select
            value={filters.colorFilter}
            onValueChange={(value) => {
              if (value) updateFilter("colorFilter", value);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Màu" />
            </SelectTrigger>
            <SelectContent>
              {colorOptions.map((option) => (
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
