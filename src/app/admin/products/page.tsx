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
  CreateProductData,
  ProductWithDetails,
  UpdateProductData,
} from "@/services/admin/adminProductService";
import { formatCurrency } from "@/utils/formatCurrency";
import { getProductImage } from "@/utils/productImages";
import { getActiveVariantStock, getSellableStock } from "@/utils/productVisibility";

import {
  activateAdminProductAction,
  createAdminProductAction,
  deactivateAdminProductAction,
  deleteAdminProductAction,
  updateAdminProductAction,
} from "./actions";

type StatusFilter = "all" | "active" | "inactive" | "hidden-web";
type SortKey = "newest" | "price-asc" | "price-desc" | "stock-asc" | "stock-desc";

function getTotalStock(product: ProductWithDetails) {
  return getSellableStock(product);
}

function getPrimaryImage(product: ProductWithDetails) {
  const primaryImage = product.images?.find((image) => image.is_primary);
  return primaryImage?.url || product.images?.[0]?.url || getProductImage(product);
}

function getVariantSummary(product: ProductWithDetails) {
  const variants = product.variants || [];
  if (variants.length === 0) {
    return product.sizes?.length || product.colors?.length
      ? `${product.sizes?.length || 0} size / ${product.colors?.length || 0} màu`
      : "Chưa có variant";
  }

  const activeCount = variants.filter((variant) => variant.is_active).length;
  return `${activeCount}/${variants.length} variant đang bán`;
}

function summarizeList(values?: string[]) {
  if (!values || values.length === 0) return "Chưa có";
  return values.join(", ");
}

function isVisibleOnStorefront(product: ProductWithDetails) {
  return product.is_active !== false && getSellableStock(product) > 0;
}

function hasImage(product: ProductWithDetails) {
  return Boolean(product.images?.[0]?.url || product.image);
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [showCreateModal, setShowCreateModal] = useState(false);
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
      const data = await adminProductService.getAllProducts();
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Không thể tải sản phẩm");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (productData: CreateProductData) => {
    try {
      const createdProduct = await createAdminProductAction(productData);
      fetchProducts();
      return createdProduct;
    } catch (error) {
      console.error("Error creating product:", error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Không thể tạo sản phẩm";
      toast.error(message);
      throw error instanceof Error ? error : new Error(message);
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
      const totalStock = getTotalStock(product);
      const isActive = product.is_active !== false;
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

      if (statusFilter === "active" && !isActive) return false;
      if (statusFilter === "inactive" && isActive) return false;
      if (statusFilter === "hidden-web" && isVisibleOnStorefront(product)) {
        return false;
      }
      if (categoryFilter !== "all" && product.category?.name !== categoryFilter) {
        return false;
      }
      if (lowStockOnly && totalStock > 5) return false;

      return true;
    });

    return [...filtered].sort((left, right) => {
      switch (sortKey) {
        case "price-asc":
          return left.price - right.price;
        case "price-desc":
          return right.price - left.price;
        case "stock-asc":
          return getTotalStock(left) - getTotalStock(right);
        case "stock-desc":
          return getTotalStock(right) - getTotalStock(left);
        case "newest":
        default: {
          const leftTime = left.created_at ? new Date(left.created_at).getTime() : 0;
          const rightTime = right.created_at ? new Date(right.created_at).getTime() : 0;
          return rightTime - leftTime;
        }
      }
    });
  }, [categoryFilter, lowStockOnly, products, searchTerm, sortKey, statusFilter]);

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
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
            RESEY Admin
          </p>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-tight">
            Quản lý sản phẩm
          </h1>
          <p className="text-zinc-500">
            Theo dõi catalog, tồn kho variant và trạng thái bán hàng.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="h-11 cursor-pointer rounded-none bg-zinc-950 text-xs font-bold uppercase tracking-[0.16em] text-white hover:bg-zinc-800"
        >
          <Plus className="mr-2 h-4 w-4" />
          Thêm sản phẩm
        </Button>
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
          <div className="grid gap-3 lg:grid-cols-[1fr_160px_160px_160px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Tìm theo tên, SKU, danh mục..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="rounded-none pl-9"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="h-10 rounded-none border border-zinc-200 bg-white px-3 text-sm"
              aria-label="Lọc theo trạng thái"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang bán</option>
              <option value="inactive">Đã ẩn</option>
              <option value="hidden-web">Không hiện ngoài web</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="h-10 rounded-none border border-zinc-200 bg-white px-3 text-sm"
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
              className="h-10 rounded-none border border-zinc-200 bg-white px-3 text-sm"
              aria-label="Sắp xếp"
            >
              <option value="newest">Mới nhất</option>
              <option value="price-asc">Giá tăng dần</option>
              <option value="price-desc">Giá giảm dần</option>
              <option value="stock-asc">Tồn kho tăng dần</option>
              <option value="stock-desc">Tồn kho giảm dần</option>
            </select>

            <label className="flex h-10 items-center gap-2 border border-zinc-200 px-3 text-sm">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(event) => setLowStockOnly(event.target.checked)}
              />
              Chỉ sắp hết hàng
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:hidden">
        {filteredProducts.map((product) => {
          const totalStock = getTotalStock(product);
          const isLowStock = totalStock <= 5;
          const isActive = product.is_active !== false;
          const visibleOnWeb = isVisibleOnStorefront(product);
          const imageMissing = !hasImage(product);
          const variantStock = getActiveVariantStock(product.variants);

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
                  <p>Size: {summarizeList(product.sizes)}</p>
                  <p>Màu: {summarizeList(product.colors)}</p>
                  {variantStock > 0 && <p>Tồn kho variant: {variantStock}</p>}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge className={isActive ? "rounded-none bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "rounded-none bg-zinc-200 text-zinc-700 hover:bg-zinc-200"}>
                    {isActive ? "Đang bán" : "Đang ẩn"}
                  </Badge>
                  {totalStock === 0 && (
                    <Badge className="rounded-none bg-zinc-950 text-white hover:bg-zinc-950">
                      Hết hàng
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
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="border-b bg-zinc-50 text-xs uppercase tracking-[0.14em] text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-bold">Sản phẩm</th>
                <th className="px-4 py-3 font-bold">Danh mục</th>
                <th className="px-4 py-3 font-bold">Giá</th>
                <th className="px-4 py-3 font-bold">Size</th>
                <th className="px-4 py-3 font-bold">Màu</th>
                <th className="px-4 py-3 font-bold">Tồn kho</th>
                <th className="px-4 py-3 font-bold">Variant</th>
                <th className="px-4 py-3 font-bold">Trạng thái</th>
                <th className="px-4 py-3 text-right font-bold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredProducts.map((product) => {
                const totalStock = getTotalStock(product);
                const isLowStock = totalStock <= 5;
                const isActive = product.is_active !== false;
                const imageMissing = !hasImage(product);
                const visibleOnWeb = isVisibleOnStorefront(product);

                return (
                  <tr key={product.product_id} className="bg-white hover:bg-zinc-50">
                    <td className="px-4 py-6">
                      <div className="flex items-center gap-3">
                        <div className="relative h-24 w-20 flex-shrink-0 overflow-hidden bg-zinc-100">
                          <Image
                            src={getPrimaryImage(product)}
                            alt={product.title}
                            fill
                            sizes="72px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="line-clamp-1 font-bold text-zinc-950">
                            {product.title}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            SKU: {product.sku || product.variants?.[0]?.sku || "Chưa có"}
                          </p>
                          <p className="mt-1 line-clamp-1 text-xs text-zinc-400">
                            {product.slug || product.product_id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-zinc-600">
                      {product.category?.name || "Chưa phân loại"}
                    </td>
                    <td className="px-4 py-4 font-bold">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="px-4 py-4 text-zinc-600">
                      {summarizeList(product.sizes)}
                    </td>
                    <td className="px-4 py-4 text-zinc-600">
                      {summarizeList(product.colors)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{totalStock}</span>
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
                      </div>
                    </td>
                    <td className="px-4 py-4 text-zinc-600">
                      {getVariantSummary(product)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge
                          className={
                            isActive
                              ? "rounded-none bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                              : "rounded-none bg-zinc-200 text-zinc-700 hover:bg-zinc-200"
                          }
                        >
                          {isActive ? "Đang bán" : "Đang ẩn"}
                        </Badge>
                        {imageMissing && (
                          <Badge className="rounded-none bg-rose-100 text-rose-700 hover:bg-rose-100">
                            Thiếu ảnh
                          </Badge>
                        )}
                        {!visibleOnWeb && (
                          <Badge className="rounded-none bg-blue-100 text-blue-700 hover:bg-blue-100">
                            Không hiện ngoài web
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Link href={`/products/${product.slug || product.product_id}`}>
                          <Button variant="outline" size="sm" className="rounded-none">
                            <Eye className="h-3 w-3" />
                            Xem
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingProduct(product)}
                          className="rounded-none"
                        >
                          <Edit className="h-3 w-3" />
                          Sửa
                        </Button>
                        {isActive ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setHidingProduct(product)}
                            className="rounded-none text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                          >
                            Ẩn
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleActivateProduct(product.product_id)}
                            className="rounded-none text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                          >
                            Hiện
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingProduct(product)}
                          className="rounded-none text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
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

      {filteredProducts.length === 0 && !loading && (
        <Card className="rounded-none">
          <CardContent className="py-12 text-center">
            <Package className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
            <h3 className="mb-2 text-lg font-bold">Không tìm thấy sản phẩm</h3>
            <p className="mb-4 text-zinc-500">
              {searchTerm || categoryFilter !== "all" || lowStockOnly
                ? "Thử đổi bộ lọc hoặc từ khóa tìm kiếm."
                : "Bắt đầu bằng cách thêm sản phẩm đầu tiên."}
            </p>
            {!searchTerm && categoryFilter === "all" && !lowStockOnly && (
              <Button onClick={() => setShowCreateModal(true)} className="rounded-none">
                <Plus className="mr-2 h-4 w-4" />
                Thêm sản phẩm
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <ProductFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateProduct}
        title="Tạo sản phẩm mới"
      />

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


