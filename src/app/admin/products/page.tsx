"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  Edit,
  Eye,
  Package,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { DeleteConfirmModal } from "@/components/admin/DeleteConfirmModal";
import { ProductFormModal } from "@/components/admin/ProductFormModal";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  adminProductService,
  ProductWithDetails,
  UpdateProductData,
} from "@/services/admin/adminProductService";
import { formatCurrency } from "@/utils/formatCurrency";
import { getProductImage } from "@/utils/productImages";
import { getSellableStock } from "@/utils/productVisibility";

import {
  activateAdminProductAction,
  deactivateAdminProductAction,
  deleteAdminProductAction,
  updateAdminProductAction,
} from "./actions";

type StatusFilter =
  | "all"
  | "active"
  | "draft"
  | "needs-fix"
  | "out-of-stock"
  | "hidden";
type SortKey = "newest" | "price-asc" | "price-desc" | "low-stock";

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "active", label: "Đang bán" },
  { key: "draft", label: "Nháp" },
  { key: "needs-fix", label: "Cần sửa" },
  { key: "out-of-stock", label: "Hết hàng" },
  { key: "hidden", label: "Tạm ẩn" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function getTotalStock(product: ProductWithDetails) {
  return getSellableStock(product);
}

function getPrimaryImage(product: ProductWithDetails) {
  const primaryImage = product.images?.find((image) => image.is_primary);
  return primaryImage?.url || product.images?.[0]?.url || getProductImage(product);
}

function getVariantSummary(product: ProductWithDetails) {
  const variants = product.variants || [];
  if (variants.length === 0) return `Tổng tồn kho: ${product.stock ?? 0}`;
  const activeVariants = variants.filter((variant) => variant.is_active !== false);
  const colorCount = new Set(activeVariants.map((variant) => variant.color).filter(Boolean)).size;
  const sizeCount = new Set(activeVariants.map((variant) => variant.size).filter(Boolean)).size;
  return `${colorCount} màu / ${sizeCount} size`;
}

function isClassifiedProduct(product: ProductWithDetails) {
  return (product.variants || []).length > 0;
}

function getProductTypeLabel(product: ProductWithDetails) {
  return isClassifiedProduct(product) ? "Có phân loại" : "Đơn giản";
}

function getActiveVariantCount(product: ProductWithDetails) {
  return (product.variants || []).filter((variant) => variant.is_active !== false).length;
}

function getVariantStatusText(product: ProductWithDetails) {
  const variants = product.variants || [];
  if (variants.length === 0) return `Tổng tồn kho: ${product.stock ?? 0}`;
  return `${getActiveVariantCount(product)}/${variants.length} phân loại đang bán`;
}

function hasVariantIssue(product: ProductWithDetails) {
  if (!isClassifiedProduct(product)) return false;
  const activeVariants = (product.variants || []).filter((variant) => variant.is_active !== false);
  return activeVariants.length === 0 || activeVariants.some((variant) => variant.stock == null || variant.stock < 0);
}

function isVisibleOnStorefront(product: ProductWithDetails) {
  return product.is_active !== false && getSellableStock(product) > 0;
}

function hasImage(product: ProductWithDetails) {
  return Boolean(product.images?.[0]?.url || product.image);
}

function getSellerStatus(product: ProductWithDetails) {
  const imageMissing = !hasImage(product);
  const categoryMissing = !product.category?.name;
  const stock = getSellableStock(product);
  const isActive = product.is_active !== false;

  if (categoryMissing || imageMissing) return "Cần sửa";
  if (!isActive && stock > 0) return "Nháp";
  if (!isActive) return "Tạm ẩn";
  if (stock <= 0) return "Hết hàng";
  return "Đang bán";
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingProduct, setEditingProduct] =
    useState<ProductWithDetails | null>(null);
  const [hidingProduct, setHidingProduct] =
    useState<ProductWithDetails | null>(null);
  const [deletingProduct, setDeletingProduct] =
    useState<ProductWithDetails | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const data = await adminProductService.getAllProducts();
      setProducts(data);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Không thể tải sản phẩm";
      console.error("[AdminProductsPage] fetchProducts failed:", error);
      setFetchError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProduct = async (
    productId: string,
    productData: UpdateProductData,
  ) => {
    try {
      const updatedProduct = await updateAdminProductAction(productId, productData);
      fetchProducts();
      return updatedProduct;
    } catch (error) {
      console.error("Error updating product:", error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Không thể cập nhật sản phẩm";
      toast.error(message);
      throw error instanceof Error ? error : new Error(message);
    }
  };

  const handleHideProduct = async (productId: string) => {
    try {
      await deactivateAdminProductAction(productId);
      toast.success("Đã ẩn sản phẩm khỏi storefront");
      setHidingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error("Error hiding product:", error);
      toast.error("Không thể ẩn sản phẩm");
    }
  };

  const handleActivateProduct = async (productId: string) => {
    try {
      await activateAdminProductAction(productId);
      toast.success("Đã hiển thị sản phẩm trên storefront");
      fetchProducts();
    } catch (error) {
      console.error("Error activating product:", error);
      toast.error("Không thể hiển thị sản phẩm");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const result = await deleteAdminProductAction(productId);
      if (result.status === "deleted") {
        toast.success("Đã xóa sản phẩm");
      } else {
        toast.warning(result.reason);
      }
      setDeletingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Không thể xóa sản phẩm. Vui lòng thử lại.");
    }
  };

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        products
          .map((product) => product.category?.name)
          .filter((category): category is string => Boolean(category)),
      ),
    ).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = products.filter((product) => {
      const skuText = [
        product.sku,
        ...(product.variants || []).map((variant) => variant.sku),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const searchableText = [
        product.title,
        product.description,
        product.category?.name,
        skuText,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (normalizedSearch && !searchableText.includes(normalizedSearch)) {
        return false;
      }

      if (statusFilter !== "all") {
        const status = getSellerStatus(product);
        const map: Record<Exclude<StatusFilter, "all">, string> = {
          active: "Đang bán",
          draft: "Nháp",
          "needs-fix": "Cần sửa",
          "out-of-stock": "Hết hàng",
          hidden: "Tạm ẩn",
        };
        if (status !== map[statusFilter]) return false;
      }

      if (categoryFilter !== "all" && product.category?.name !== categoryFilter) {
        return false;
      }

      return true;
    });

    return [...filtered].sort((left, right) => {
      switch (sortKey) {
        case "price-asc":
          return left.price - right.price;
        case "price-desc":
          return right.price - left.price;
        case "low-stock":
          return getTotalStock(left) - getTotalStock(right);
        case "newest":
        default: {
          const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
          const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
          return rightTime - leftTime;
        }
      }
    });
  }, [categoryFilter, products, searchTerm, sortKey, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, categoryFilter, sortKey, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedProducts = useMemo(
    () =>
      filteredProducts.slice(
        (safePage - 1) * pageSize,
        (safePage - 1) * pageSize + pageSize,
      ),
    [filteredProducts, safePage, pageSize],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: products.length,
      active: 0,
      draft: 0,
      "needs-fix": 0,
      "out-of-stock": 0,
      hidden: 0,
    };
    for (const product of products) {
      const status = getSellerStatus(product);
      if (status === "Đang bán") counts.active += 1;
      else if (status === "Nháp") counts.draft += 1;
      else if (status === "Cần sửa") counts["needs-fix"] += 1;
      else if (status === "Hết hàng") counts["out-of-stock"] += 1;
      else if (status === "Tạm ẩn") counts.hidden += 1;
    }
    return counts;
  }, [products]);

  const totalProducts = products.length;
  const activeProducts = products.filter((product) => product.is_active !== false).length;
  const lowStockProducts = products.filter((product) => getTotalStock(product) <= 5).length;
  const totalInventory = products.reduce(
    (total, product) => total + getTotalStock(product),
    0,
  );

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex h-64 flex-col items-center justify-center gap-3">
          <LoadingSpinner />
          <p className="text-sm text-zinc-500">Đang tải sản phẩm…</p>
        </div>
      </div>
    );
  }

  if (fetchError && products.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <Card className="rounded-none border-rose-200 bg-rose-50">
          <CardContent className="space-y-3 p-6 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-rose-600" />
            <h2 className="text-lg font-black uppercase text-rose-800">
              Không tải được sản phẩm
            </h2>
            <p className="text-sm text-rose-700 break-all">{fetchError}</p>
            <Button
              onClick={fetchProducts}
              className="rounded-none bg-zinc-950 text-white hover:bg-zinc-800"
            >
              Thử lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 py-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
            RESEY Admin
          </p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight">
            Quản lý sản phẩm
          </h1>
          <p className="text-zinc-500">
            Theo dõi sản phẩm, tồn kho và trạng thái bán hàng.
          </p>
        </div>
        <Link href="/admin/products/new">
          <Button className="h-11 cursor-pointer rounded-none bg-zinc-950 text-xs font-bold uppercase tracking-[0.16em] text-white hover:bg-zinc-800">
            <Plus className="mr-2 h-4 w-4" />
            Thêm sản phẩm mới
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-none">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Tổng sản phẩm</p>
            <p className="mt-2 text-2xl font-black">{totalProducts}</p>
          </CardContent>
        </Card>
        <Card className="rounded-none">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Đang bán</p>
            <p className="mt-2 text-2xl font-black">{activeProducts}</p>
          </CardContent>
        </Card>
        <Card className="rounded-none">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Sắp hết hàng</p>
            <p className="mt-2 text-2xl font-black">{lowStockProducts}</p>
          </CardContent>
        </Card>
        <Card className="rounded-none">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Tổng tồn kho</p>
            <p className="mt-2 text-2xl font-black">{totalInventory}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-none">
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Tìm sản phẩm hoặc SKU"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-11 rounded-none pl-9 text-sm"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="h-11 rounded-none border border-zinc-200 bg-white px-3 text-sm"
              aria-label="Lọc theo danh mục"
            >
              <option value="all">Tất cả danh mục</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
              className="h-11 rounded-none border border-zinc-200 bg-white px-3 text-sm"
              aria-label="Sắp xếp"
            >
              <option value="newest">Mới nhất</option>
              <option value="price-asc">Giá thấp đến cao</option>
              <option value="price-desc">Giá cao đến thấp</option>
              <option value="low-stock">Sắp hết hàng</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Lọc trạng thái">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStatusFilter(tab.key)}
                  className={
                    "h-9 cursor-pointer border px-3 text-xs font-bold uppercase tracking-[0.14em] transition " +
                    (active
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400")
                  }
                >
                  {tab.label}
                  <span className={"ml-2 text-[10px] " + (active ? "text-zinc-300" : "text-zinc-500")}>
                    {statusCounts[tab.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:hidden">
        {pagedProducts.map((product) => {
          const totalStock = getTotalStock(product);
          const isLowStock = totalStock <= 5;
          const isActive = product.is_active !== false;
          const visibleOnWeb = isVisibleOnStorefront(product);
          const imageMissing = !hasImage(product);
          const classifiedProduct = isClassifiedProduct(product);
          const variantIssue = hasVariantIssue(product);

          return (
            <Card key={product.product_id} className="overflow-hidden rounded-none">
              <CardContent className="space-y-4 p-4">
                <div className="flex gap-4">
                  <div className="relative h-28 w-20 flex-shrink-0 overflow-hidden bg-zinc-100">
                    <Image
                      src={getPrimaryImage(product)}
                      alt={product.title}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-base font-black text-zinc-950">
                      {product.title}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600">
                      {product.category?.name || "Chưa phân loại"}
                    </p>
                    <p className="mt-2 text-base font-black text-black">
                      {formatCurrency(product.price)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="border border-zinc-200 p-3">
                    <p className="text-xs font-bold uppercase text-zinc-500">Tồn kho</p>
                    <p className="mt-1 font-black">{totalStock}</p>
                    {isLowStock && <p className="mt-1 text-xs font-bold text-red-600">Sắp hết hàng</p>}
                  </div>
                  <div className="border border-zinc-200 p-3">
                    <p className="text-xs font-bold uppercase text-zinc-500">Trạng thái</p>
                    <p className="mt-1 font-black">{isActive ? "Đang bán" : "Tạm ẩn"}</p>
                  </div>
                </div>

                <div className="text-sm text-zinc-700">
                  <p>Loại: {getProductTypeLabel(product)}</p>
                  {classifiedProduct ? (
                    <>
                      <p>{getVariantSummary(product)}</p>
                      <p>{getVariantStatusText(product)}</p>
                      <p>Tổng tồn kho: {totalStock}</p>
                    </>
                  ) : (
                    <p>Tổng tồn kho: {totalStock}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge className="rounded-none bg-black text-white hover:bg-black">
                    {getProductTypeLabel(product)}
                  </Badge>
                  <Badge className="rounded-none bg-zinc-100 text-zinc-700 hover:bg-zinc-100">
                    {getSellerStatus(product)}
                  </Badge>
                  <Badge className={isActive ? "rounded-none bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "rounded-none bg-zinc-200 text-zinc-700 hover:bg-zinc-200"}>
                    {isActive ? "Đang bán" : "Đang ẩn"}
                  </Badge>
                  {totalStock === 0 && (
                    <Badge className="rounded-none bg-zinc-950 text-white hover:bg-zinc-950">
                      Hết hàng
                    </Badge>
                  )}
                  {totalStock === 0 && !classifiedProduct && (
                    <Badge className="rounded-none bg-amber-100 text-amber-800 hover:bg-amber-100">
                      Thiếu tồn kho
                    </Badge>
                  )}
                  {variantIssue && (
                    <Badge className="rounded-none bg-amber-100 text-amber-800 hover:bg-amber-100">
                      Phân loại cần sửa
                    </Badge>
                  )}
                  {isLowStock && totalStock > 0 && (
                    <Badge className="rounded-none bg-amber-100 text-amber-800 hover:bg-amber-100">
                      Sắp hết hàng
                    </Badge>
                  )}
                  {imageMissing && (
                    <Badge className="rounded-none bg-rose-100 text-rose-700 hover:bg-rose-100">
                      Thiếu ảnh
                    </Badge>
                  )}
                  {!product.category?.name && (
                    <Badge className="rounded-none bg-amber-100 text-amber-700 hover:bg-amber-100">
                      Chưa có danh mục
                    </Badge>
                  )}
                  {!visibleOnWeb && (
                    <Badge className="rounded-none bg-blue-100 text-blue-700 hover:bg-blue-100">
                      Không hiện ngoài web
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <Link href={`/products/${product.slug || product.product_id}`}>
                    <Button variant="outline" className="h-10 w-full rounded-none">
                      Xem
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => setEditingProduct(product)}
                    className="h-10 rounded-none"
                  >
                    Sửa
                  </Button>
                  {isActive ? (
                    <Button
                      variant="outline"
                      onClick={() => setHidingProduct(product)}
                      className="h-10 rounded-none text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                    >
                      Ẩn
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => handleActivateProduct(product.product_id)}
                      className="h-10 rounded-none text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                    >
                      Hiện
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setDeletingProduct(product)}
                    className="h-10 rounded-none text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    Xóa
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="hidden overflow-hidden rounded-none md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1240px] text-left text-sm">
            <thead className="border-b bg-zinc-50 text-xs uppercase tracking-[0.14em] text-zinc-500">
              <tr>
                <th className="px-5 py-4 font-bold">Sản phẩm</th>
                <th className="px-4 py-4 font-bold">Danh mục</th>
                <th className="px-4 py-4 font-bold">Giá</th>
                <th className="px-4 py-4 font-bold">Loại</th>
                <th className="px-4 py-4 font-bold">Phân loại</th>
                <th className="px-4 py-4 font-bold">Tồn kho</th>
                <th className="px-4 py-4 font-bold">Trạng thái</th>
                <th className="sticky right-0 bg-zinc-50 px-4 py-4 text-right font-bold shadow-[inset_1px_0_0_0_rgb(228_228_231)]">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {pagedProducts.map((product) => {
                const totalStock = getTotalStock(product);
                const isLowStock = totalStock <= 5;
                const isActive = product.is_active !== false;
                const imageMissing = !hasImage(product);
                const visibleOnWeb = isVisibleOnStorefront(product);
                const classifiedProduct = isClassifiedProduct(product);
                const variantIssue = hasVariantIssue(product);

                return (
                  <tr key={product.product_id} className="group bg-white hover:bg-zinc-50">
                    <td className="px-5 py-5 align-top">
                      <div className="flex items-start gap-4">
                        <div className="relative h-28 w-24 flex-shrink-0 overflow-hidden bg-zinc-100">
                          <Image
                            src={getPrimaryImage(product)}
                            alt={product.title}
                            fill
                            sizes="96px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0 max-w-md">
                          <p className="line-clamp-2 text-sm font-bold leading-snug text-zinc-950">
                            {product.title}
                          </p>
                          <p className="mt-1.5 text-xs text-zinc-500">
                            SKU: {product.sku || product.variants?.[0]?.sku || "Chưa có"}
                          </p>
                          <p className="mt-0.5 line-clamp-1 text-xs text-zinc-400">
                            /{product.slug || "chua-co-url"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5 align-top text-sm text-zinc-700">
                      {product.category?.name || (
                        <span className="text-amber-700">Chưa phân loại</span>
                      )}
                    </td>
                    <td className="px-4 py-5 align-top text-sm font-bold text-zinc-950">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="px-4 py-5 align-top">
                      <Badge className="rounded-none bg-black text-white hover:bg-black">
                        {getProductTypeLabel(product)}
                      </Badge>
                    </td>
                    <td className="px-4 py-5 align-top text-sm text-zinc-700">
                      <p>{classifiedProduct ? getVariantSummary(product) : "Không có màu/size riêng"}</p>
                      {classifiedProduct && (
                        <p className="mt-1 text-xs text-zinc-500">{getVariantStatusText(product)}</p>
                      )}
                    </td>
                    <td className="px-4 py-5 align-top">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-base font-black text-zinc-950">{totalStock}</span>
                        {isLowStock && totalStock > 0 && (
                          <Badge className="rounded-none bg-red-100 text-red-700 hover:bg-red-100">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Sắp hết hàng
                          </Badge>
                        )}
                        {totalStock === 0 && (
                          <Badge className="rounded-none bg-zinc-950 text-white hover:bg-zinc-950">
                            Hết hàng
                          </Badge>
                        )}
                        {totalStock === 0 && !classifiedProduct && (
                          <Badge className="rounded-none bg-amber-100 text-amber-800 hover:bg-amber-100">
                            Thiếu tồn kho
                          </Badge>
                        )}
                        {variantIssue && (
                          <Badge className="rounded-none bg-amber-100 text-amber-800 hover:bg-amber-100">
                            Phân loại cần sửa
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-5 align-top">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge
                          className={
                            isActive
                              ? "rounded-none bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                              : "rounded-none bg-zinc-200 text-zinc-700 hover:bg-zinc-200"
                          }
                        >
                          {getSellerStatus(product)}
                        </Badge>
                        {imageMissing && (
                          <Badge className="rounded-none bg-rose-100 text-rose-700 hover:bg-rose-100">
                            Thiếu ảnh
                          </Badge>
                        )}
                        {!product.category?.name && (
                          <Badge className="rounded-none bg-amber-100 text-amber-700 hover:bg-amber-100">
                            Chưa có danh mục
                          </Badge>
                        )}
                        {!visibleOnWeb && (
                          <Badge className="rounded-none bg-blue-100 text-blue-700 hover:bg-blue-100">
                            Không hiện ngoài web
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="sticky right-0 bg-white px-4 py-5 align-top shadow-[inset_1px_0_0_0_rgb(228_228_231)] group-hover:bg-zinc-50">
                      <div className="flex flex-col items-stretch gap-1.5">
                        <Link href={`/products/${product.slug || product.product_id}`} target="_blank">
                          <Button variant="outline" size="sm" className="h-9 w-full justify-start rounded-none">
                            <Eye className="mr-1.5 h-4 w-4" />
                            Xem
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingProduct(product)}
                          className="h-9 w-full justify-start rounded-none"
                        >
                          <Edit className="mr-1.5 h-4 w-4" />
                          Sửa
                        </Button>
                        {isActive ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setHidingProduct(product)}
                            className="h-9 w-full justify-start rounded-none text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                          >
                            Ẩn
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleActivateProduct(product.product_id)}
                            className="h-9 w-full justify-start rounded-none text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                          >
                            Hiện
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingProduct(product)}
                          className="h-9 w-full justify-start rounded-none text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="mr-1.5 h-4 w-4" />
                          Xóa
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {filteredProducts.length > 0 && (
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-sm text-zinc-600">
            Hiển thị{" "}
            <span className="font-bold text-zinc-900">
              {(safePage - 1) * pageSize + 1}-
              {Math.min(safePage * pageSize, filteredProducts.length)}
            </span>{" "}
            trên{" "}
            <span className="font-bold text-zinc-900">{filteredProducts.length}</span>{" "}
            sản phẩm
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-zinc-600">
              Số dòng mỗi trang
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="h-9 rounded-none border border-zinc-200 bg-white px-2 text-sm"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-none"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              Trước
            </Button>
            <span className="text-xs text-zinc-600">
              Trang <span className="font-bold text-zinc-900">{safePage}</span> / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-none"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            >
              Sau
            </Button>
          </div>
        </div>
      )}

      {filteredProducts.length === 0 && !loading && (
        <Card className="rounded-none">
          <CardContent className="py-12 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
            <h3 className="mb-2 text-lg font-bold">Không tìm thấy sản phẩm</h3>
            <p className="mb-4 text-zinc-500">
              {searchTerm || categoryFilter !== "all" || statusFilter !== "all"
                ? "Thử đổi bộ lọc hoặc từ khóa tìm kiếm."
                : "Bắt đầu bằng cách thêm sản phẩm đầu tiên."}
            </p>
            {!searchTerm && categoryFilter === "all" && statusFilter === "all" && (
              <Link href="/admin/products/new">
                <Button className="rounded-none">
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm sản phẩm mới
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      <ProductFormModal
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        onSubmit={(data) => handleUpdateProduct(editingProduct!.product_id, data)}
        product={editingProduct}
        title="Sửa sản phẩm"
      />

      <DeleteConfirmModal
        isOpen={!!hidingProduct}
        onClose={() => setHidingProduct(null)}
        onConfirm={() => handleHideProduct(hidingProduct!.product_id)}
        title="Ẩn sản phẩm"
        description={`Ẩn "${hidingProduct?.title}" khỏi storefront? Sản phẩm vẫn còn trong database và đơn hàng cũ không bị ảnh hưởng.`}
      />

      <DeleteConfirmModal
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={() => handleDeleteProduct(deletingProduct!.product_id)}
        title="Xóa sản phẩm vĩnh viễn"
        description={`Xóa "${deletingProduct?.title}" khỏi database. Nếu sản phẩm có trong đơn hàng cũ, hệ thống sẽ chuyển sang trạng thái ẩn thay vì xóa để bảo vệ lịch sử.`}
      />
    </div>
  );
}


