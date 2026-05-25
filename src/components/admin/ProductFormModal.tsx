"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AdminVariantInput,
  syncAdminProductVariantsAction,
  updateAdminProductAction,
} from "@/app/admin/products/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories } from "@/hooks/queries";
import {
  CreateProductData,
  ProductWithDetails,
} from "@/services/admin/adminProductService";
import {
  uploadAndAttachProductImages,
  validateProductImageFile,
} from "@/services/storage/productImageUpload";
import type { ProductType } from "@/types";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProductData) => Promise<ProductType | void>;
  product?: ProductWithDetails | null;
  title: string;
}

interface FormData {
  title: string;
  slug: string;
  description: string;
  material: string;
  price: string;
  sale_price: string;
  image: string;
  stock: string;
  sku: string;
  category_id: string;
  sizes: string;
  colors: string;
  is_active: boolean;
}

interface VariantDraft {
  id?: string;
  size: string;
  color: string;
  sku: string;
  stock: string;
  price_override: string;
  is_active: boolean;
}

const defaultVariant = (): VariantDraft => ({
  size: "M",
  color: "Đen",
  sku: "",
  stock: "10",
  price_override: "",
  is_active: true,
});

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function looksLikeTestProduct(title: string, description: string) {
  const text = `${title} ${description}`.toLowerCase();
  return /(test|demo|sample|mock|aaa|123)/.test(text);
}

function buildInitialVariants(product?: ProductWithDetails | null): VariantDraft[] {
  if (!product) return [defaultVariant()];

  if (product.variants && product.variants.length > 0) {
    return product.variants.map((variant) => ({
      id: variant.id,
      size: variant.size,
      color: variant.color,
      sku: variant.sku || "",
      stock: String(variant.stock || 0),
      price_override: variant.price_override ? String(variant.price_override) : "",
      is_active: variant.is_active,
    }));
  }

  const sizes = product.sizes && product.sizes.length > 0 ? product.sizes : ["M"];
  const colors = product.colors && product.colors.length > 0 ? product.colors : ["Đen"];
  const firstStock = product.stock || 0;

  return sizes.flatMap((size, sizeIndex) =>
    colors.map((color, colorIndex) => ({
      size,
      color,
      sku: product.sku ? `${product.sku}-${size}-${color}`.toUpperCase() : "",
      stock: sizeIndex === 0 && colorIndex === 0 ? String(firstStock) : "0",
      price_override: "",
      is_active: true,
    })),
  );
}

export function ProductFormModal({
  isOpen,
  onClose,
  onSubmit,
  product,
  title,
}: ProductFormModalProps) {
  const [formData, setFormData] = useState<FormData>({
    title: "",
    slug: "",
    description: "",
    material: "",
    price: "",
    sale_price: "",
    image: "",
    stock: "",
    sku: "",
    category_id: "no-category",
    sizes: "",
    colors: "",
    is_active: true,
  });
  const [variants, setVariants] = useState<VariantDraft[]>([defaultVariant()]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  const [newColorInput, setNewColorInput] = useState("");
  const [newSizeInput, setNewSizeInput] = useState("");

  const {
    data: categories,
    isLoading: categoriesLoading,
    error: categoriesError,
    refetch: refetchCategories,
  } = useCategories();

  useEffect(() => {
    if (product) {
      setFormData({
        title: product.title || "",
        slug: product.slug || "",
        description: product.description || "",
        material: product.material || "",
        price: product.price?.toString() || "",
        sale_price: product.sale_price?.toString() || "",
        image: product.image || "",
        stock: product.stock?.toString() || "",
        sku: product.sku || "",
        category_id: product.category_id?.toString() || "no-category",
        sizes: product.sizes?.join(", ") || "",
        colors: product.colors?.join(", ") || "",
        is_active: product.is_active !== false,
      });
    } else {
      setFormData({
        title: "",
        slug: "",
        description: "",
        material: "",
        price: "",
        sale_price: "",
        image: "",
        stock: "",
        sku: "",
        category_id: "no-category",
        sizes: "S, M, L, XL",
        colors: "Đen, Trắng, Xám",
        is_active: true,
      });
    }

    setVariants(buildInitialVariants(product));
    setErrors({});
    setSelectedFiles([]);
    setPreviewUrls([]);
    setPrimaryImageIndex(0);
  }, [product, isOpen]);

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const getVariantTotalStock = () => {
    return variants.reduce((total, variant) => {
      const stock = Number.parseInt(variant.stock || "0", 10);
      return total + (Number.isNaN(stock) ? 0 : stock);
    }, 0);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = "Vui lòng nhập tên sản phẩm";
    if (formData.slug.trim() && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formData.slug.trim())) {
      newErrors.slug = "Slug chỉ dùng chữ thường, số và dấu gạch ngang";
    }
    if (!formData.description.trim()) newErrors.description = "Vui lòng nhập mô tả sản phẩm";

    const price = Number.parseFloat(formData.price);
    if (!formData.price.trim()) {
      newErrors.price = "Vui lòng nhập giá bán";
    } else if (Number.isNaN(price) || price <= 0) {
      newErrors.price = "Giá bán phải lớn hơn 0";
    }

    if (variants.length === 0) {
      newErrors.variants = "Cần ít nhất một variant size/màu";
    }

    if (formData.is_active) {
      if (formData.category_id === "no-category") {
        newErrors.category_id = "Vui lòng chọn danh mục.";
      }
      const hasAnyImage =
        selectedFiles.length > 0 || !!formData.image.trim() || !!product?.images?.[0]?.url;
      if (!hasAnyImage) {
        newErrors.imageFiles = "Vui lòng tải ít nhất 1 ảnh sản phẩm.";
      }

      const hasStock =
        variants.reduce((sum, variant) => sum + Math.max(0, Number.parseInt(variant.stock || "0", 10) || 0), 0) > 0;
      if (!hasStock) {
        newErrors.stock = "Vui lòng nhập tồn kho hoặc tạo biến thể.";
      }

      if (looksLikeTestProduct(formData.title, formData.description)) {
        newErrors.submit = "Không thể đăng bán sản phẩm test/demo.";
      }
    }

    const variantKeys = new Set<string>();
    variants.forEach((variant, index) => {
      if (!variant.size.trim()) newErrors[`variant-${index}-size`] = "Thiếu size";
      if (!variant.color.trim()) newErrors[`variant-${index}-color`] = "Thiếu màu";

      const stock = Number.parseInt(variant.stock, 10);
      if (Number.isNaN(stock) || stock < 0) {
        newErrors[`variant-${index}-stock`] = "Tồn kho không được âm";
      }

      if (variant.price_override.trim()) {
        const priceOverride = Number.parseFloat(variant.price_override);
        if (Number.isNaN(priceOverride) || priceOverride <= 0) {
          newErrors[`variant-${index}-price`] = "Giá riêng phải > 0";
        }
      }

      const key = `${variant.size.trim().toLowerCase()}::${variant.color.trim().toLowerCase()}`;
      if (variantKeys.has(key)) {
        newErrors.variants = "Không được trùng size + màu";
      }
      variantKeys.add(key);
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const productStock = getVariantTotalStock();
      const variantSizes = Array.from(
        new Set(variants.map((variant) => variant.size.trim()).filter(Boolean)),
      );
      const variantColors = Array.from(
        new Set(variants.map((variant) => variant.color.trim()).filter(Boolean)),
      );
      const submitData: CreateProductData = {
        title: formData.title.trim(),
        slug: formData.slug.trim() || slugify(formData.title),
        description: formData.description.trim(),
        material: formData.material.trim() || undefined,
        price: Number.parseFloat(formData.price),
        sale_price: formData.sale_price.trim()
          ? Number.parseFloat(formData.sale_price)
          : null,
        image: formData.image.trim() || undefined,
        stock: productStock,
        sizes: parseList(formData.sizes).length > 0 ? parseList(formData.sizes) : variantSizes,
        colors:
          parseList(formData.colors).length > 0
            ? parseList(formData.colors)
            : variantColors,
        is_active: formData.is_active,
        sku: formData.sku.trim() || undefined,
        category_id:
          formData.category_id && formData.category_id !== "no-category"
            ? Number.parseInt(formData.category_id, 10)
            : undefined,
      };

      const savedProduct = (await onSubmit(submitData)) || product;
      if (!savedProduct?.product_id) {
        throw new Error("Không lấy được product id sau khi lưu.");
      }

      const variantPayload: AdminVariantInput[] = variants.map((variant) => ({
        id: variant.id,
        size: variant.size.trim(),
        color: variant.color.trim(),
        sku: variant.sku.trim() || null,
        stock: Number.parseInt(variant.stock, 10),
        price_override: variant.price_override.trim()
          ? Number.parseFloat(variant.price_override)
          : null,
        image_url: null,
        is_active: variant.is_active,
      }));

      let variantSyncFailed = false;
      try {
        await syncAdminProductVariantsAction(savedProduct.product_id, variantPayload);
      } catch (variantError) {
        variantSyncFailed = true;
        console.error("Product variant sync failed:", variantError);
        toast.warning(
          "Sản phẩm đã được lưu, nhưng biến thể size/màu chưa được đồng bộ.",
        );
      }

      let imageUploadFailed = false;
      if (selectedFiles.length > 0) {
        try {
          const uploadedImages = await uploadAndAttachProductImages(
            savedProduct.product_id,
            selectedFiles,
            primaryImageIndex,
          );
          const uploadedPrimaryImage =
            uploadedImages[primaryImageIndex]?.url || uploadedImages[0]?.url;
          if (uploadedPrimaryImage) {
            await updateAdminProductAction(savedProduct.product_id, {
              image: uploadedPrimaryImage,
            });
          }
        } catch (uploadError) {
          const uploadMessage =
            uploadError instanceof Error
              ? uploadError.message
              : "Không rõ nguyên nhân.";

          console.error("Product image upload failed:", uploadError);
          setErrors((previous) => ({
            ...previous,
            imageFiles: `Upload ảnh thất bại: ${uploadMessage}`,
          }));
          imageUploadFailed = true;
          toast.warning(
            "Sản phẩm đã được lưu, nhưng ảnh sản phẩm chưa được tải lên.",
          );
          toast.warning(
            "Vui lòng kiểm tra lại ảnh sản phẩm trước khi hiển thị sản phẩm trên cửa hàng.",
          );
        }
      }

      if (variantSyncFailed || imageUploadFailed) {
        setErrors((previous) => ({
          ...previous,
          submit:
            "Sản phẩm đã lưu một phần. Vui lòng kiểm tra lại biến thể và ảnh trước khi mở bán.",
        }));
        return;
      }

      toast.success(product ? "Đã cập nhật sản phẩm" : "Tạo sản phẩm thành công");
      onClose();
    } catch (error) {
      console.error("Error submitting product:", error);
      setErrors((previous) => ({
        ...previous,
        submit:
          error instanceof Error
            ? error.message
            : "Không thể lưu sản phẩm. Vui lòng thử lại.",
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    if (errors[field]) {
      setErrors((previous) => ({ ...previous, [field]: "" }));
    }
  };

  const handleCheckedChange = (field: keyof FormData, value: boolean) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  const handleVariantChange = (
    index: number,
    field: keyof VariantDraft,
    value: string | boolean,
  ) => {
    setVariants((previous) =>
      previous.map((variant, currentIndex) =>
        currentIndex === index ? { ...variant, [field]: value } : variant,
      ),
    );
    setErrors((previous) => ({ ...previous, variants: "" }));
  };

  const addVariant = () => {
    setVariants((previous) => [...previous, defaultVariant()]);
  };

  const addColorVariants = () => {
    const color = newColorInput.trim();
    if (!color) return;

    const sizes = parseList(formData.sizes).length > 0
      ? parseList(formData.sizes)
      : Array.from(new Set(variants.map((variant) => variant.size).filter(Boolean)));

    setVariants((previous) => [
      ...previous,
      ...sizes.map((size) => ({
        size,
        color,
        sku: formData.sku ? `${formData.sku}-${color}-${size}`.toUpperCase() : "",
        stock: "0",
        price_override: "",
        is_active: true,
      })),
    ]);
    setNewColorInput("");
  };

  const addSizeVariants = () => {
    const size = newSizeInput.trim();
    if (!size) return;

    const colors = parseList(formData.colors).length > 0
      ? parseList(formData.colors)
      : Array.from(new Set(variants.map((variant) => variant.color).filter(Boolean)));

    setVariants((previous) => [
      ...previous,
      ...colors.map((color) => ({
        size,
        color,
        sku: formData.sku ? `${formData.sku}-${color}-${size}`.toUpperCase() : "",
        stock: "0",
        price_override: "",
        is_active: true,
      })),
    ]);
    setNewSizeInput("");
  };

  const removeVariant = (index: number) => {
    setVariants((previous) => previous.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleImageFilesChange = (files: FileList | null) => {
    const nextFiles = Array.from(files || []);
    const validationError = nextFiles
      .map((file) => validateProductImageFile(file))
      .find((message): message is string => Boolean(message));

    if (validationError) {
      setErrors((previous) => ({ ...previous, imageFiles: validationError }));
      return;
    }

    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setSelectedFiles(nextFiles);
    setPreviewUrls(nextFiles.map((file) => URL.createObjectURL(file)));
    setPrimaryImageIndex(0);
    setErrors((previous) => ({ ...previous, imageFiles: "" }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {product
              ? "Cập nhật thông tin, ảnh và tồn kho variant."
              : "Tạo sản phẩm mới với size, màu và tồn kho thật."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="space-y-4 rounded-2xl border border-zinc-200 p-5">
            <h3 className="text-sm font-black uppercase tracking-[0.16em]">
              Thông tin cơ bản
            </h3>
            <div>
              <Label htmlFor="title">Tên sản phẩm *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(event) => handleInputChange("title", event.target.value)}
                placeholder="RESEY Basic Tee"
                className={`h-12 text-base ${errors.title ? "border-rose-500" : ""}`}
              />
              <p className="mt-1 text-xs text-zinc-500">Ví dụ: RESEY Basic Tee</p>
              {errors.title && <p className="mt-1 text-sm text-rose-600">{errors.title}</p>}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="slug">Slug URL</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(event) => handleInputChange("slug", event.target.value)}
                  onBlur={() =>
                    handleInputChange("slug", slugify(formData.slug || formData.title))
                  }
                  placeholder="resey-washed-tee"
                  className={`h-12 text-base ${errors.slug ? "border-rose-500" : ""}`}
                />
                {errors.slug && <p className="mt-1 text-sm text-rose-600">{errors.slug}</p>}
              </div>

              <div>
                <Label htmlFor="material">Chất liệu</Label>
                <Input
                  id="material"
                  value={formData.material}
                  onChange={(event) => handleInputChange("material", event.target.value)}
                  placeholder="Cotton washed 260gsm"
                  className="h-12 text-base"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Mô tả *</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(event) => handleInputChange("description", event.target.value)}
                placeholder="Mô tả chất liệu, fit, phong cách..."
                rows={6}
                className={`w-full rounded-2xl border px-4 py-3 text-base focus:outline-none ${
                  errors.description ? "border-rose-500" : "border-zinc-300"
                }`}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-rose-600">{errors.description}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label htmlFor="price">Giá bán *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={(event) => handleInputChange("price", event.target.value)}
                  placeholder="450000"
                  className={`h-12 text-base ${errors.price ? "border-rose-500" : ""}`}
                />
                <p className="mt-1 text-xs text-zinc-500">Nhập giá bán bằng VND</p>
                {errors.price && <p className="mt-1 text-sm text-rose-600">{errors.price}</p>}
              </div>

              <div>
                <Label htmlFor="sale_price">Giá khuyến mãi</Label>
                <Input
                  id="sale_price"
                  type="number"
                  min="0"
                  value={formData.sale_price}
                  onChange={(event) => handleInputChange("sale_price", event.target.value)}
                  placeholder="Để trống nếu không giảm giá"
                  className="h-12 text-base"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Nhập giá khuyến mãi để hiển thị giá gạch ngang
                </p>
              </div>

              <div>
                <Label htmlFor="sku">Mã SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(event) => handleInputChange("sku", event.target.value)}
                  placeholder="RESEY-TEE-BLK-M"
                  className="h-12 text-base"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Mã nội bộ để quản lý kho, ví dụ: RESEY-TEE-BLK-M
                </p>
              </div>

              <div>
                <Label htmlFor="category">Danh mục</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => handleInputChange("category_id", value || "")}
                  disabled={categoriesLoading || !!categoriesError}
                >
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Chọn danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-category">Chưa phân loại</SelectItem>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {categoriesError && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 rounded-2xl"
                    onClick={() => void refetchCategories()}
                  >
                    Tải lại danh mục
                  </Button>
                )}
                {errors.category_id && (
                  <p className="mt-1 text-sm text-rose-600">{errors.category_id}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="sizes">Size</Label>
                <Input
                  id="sizes"
                  value={formData.sizes}
                  onChange={(event) => handleInputChange("sizes", event.target.value)}
                  placeholder="S, M, L, XL"
                  className="h-12 text-base"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Tổng số lượng còn bán. Nếu dùng size/màu, tồn kho nên được tính từ variant.
                </p>
              </div>

              <div>
                <Label htmlFor="colors">Màu</Label>
                <Input
                  id="colors"
                  value={formData.colors}
                  onChange={(event) => handleInputChange("colors", event.target.value)}
                  placeholder="Đen, Trắng, Xám"
                  className="h-12 text-base"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(event) =>
                  handleCheckedChange("is_active", event.target.checked)
                }
              />
              Hiển thị sản phẩm trên storefront
            </label>
            {errors.stock && <p className="text-sm text-rose-600">{errors.stock}</p>}
          </section>

          <section className="space-y-4 rounded-2xl border border-zinc-200 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.16em]">
                  Màu sắc, size & tồn kho
                </h3>
                <p className="text-xs text-zinc-500">
                  Tồn kho tổng hiện tại: {getVariantTotalStock()} sản phẩm
                </p>
                {getVariantTotalStock() === 0 && (
                  <p className="text-xs font-bold text-amber-600">
                    Tổng tồn kho = 0. Sản phẩm sẽ không hiển thị trên trang sản phẩm cho đến khi có tồn kho.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex gap-1">
                  <Input
                    placeholder="Thêm màu mới (vd: Đỏ)"
                    value={newColorInput}
                    onChange={(event) => setNewColorInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addColorVariants();
                      }
                    }}
                    className="h-9 w-40 rounded-none text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-none"
                    onClick={addColorVariants}
                  >
                    + Màu
                  </Button>
                </div>
                <div className="flex gap-1">
                  <Input
                    placeholder="Thêm size mới (vd: XL)"
                    value={newSizeInput}
                    onChange={(event) => setNewSizeInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addSizeVariants();
                      }
                    }}
                    className="h-9 w-36 rounded-none text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-none"
                    onClick={addSizeVariants}
                  >
                    + Size
                  </Button>
                </div>
                <Button type="button" variant="outline" size="sm" className="rounded-none" onClick={addVariant}>
                  <Plus className="mr-1 h-3 w-3" />
                  Thêm thủ công
                </Button>
              </div>
            </div>

            {errors.variants && <p className="text-sm text-rose-600">{errors.variants}</p>}

            <div className="space-y-3">
              {variants.map((variant, index) => (
                <div
                  key={`${variant.id || "new"}-${index}`}
                  className="grid gap-3 rounded-2xl border border-zinc-100 p-3 md:grid-cols-[1fr_1fr_1.2fr_0.8fr_1fr_auto_auto]"
                >
                  <div>
                    <Label>Size</Label>
                    <Input
                      value={variant.size}
                      onChange={(event) => handleVariantChange(index, "size", event.target.value)}
                      placeholder="S / M / L"
                      className={errors[`variant-${index}-size`] ? "border-rose-500" : ""}
                    />
                  </div>
                  <div>
                    <Label>Màu</Label>
                    <Input
                      value={variant.color}
                      onChange={(event) => handleVariantChange(index, "color", event.target.value)}
                      placeholder="Đen"
                      className={errors[`variant-${index}-color`] ? "border-rose-500" : ""}
                    />
                  </div>
                  <div>
                    <Label>Mã SKU</Label>
                    <Input
                      value={variant.sku}
                      onChange={(event) => handleVariantChange(index, "sku", event.target.value)}
                      placeholder="RESEY-TEE-BLK-M"
                    />
                  </div>
                  <div>
                    <Label>Tồn kho</Label>
                    <Input
                      type="number"
                      min="0"
                      value={variant.stock}
                      onChange={(event) => handleVariantChange(index, "stock", event.target.value)}
                      className={errors[`variant-${index}-stock`] ? "border-rose-500" : ""}
                    />
                  </div>
                  <div>
                    <Label>Giá riêng</Label>
                    <Input
                      type="number"
                      min="0"
                      value={variant.price_override}
                      onChange={(event) =>
                        handleVariantChange(index, "price_override", event.target.value)
                      }
                      placeholder="Để trống"
                      className={errors[`variant-${index}-price`] ? "border-rose-500" : ""}
                    />
                  </div>
                  <label className="flex items-center gap-2 pt-6 text-sm">
                    <input
                      type="checkbox"
                      checked={variant.is_active}
                      onChange={(event) =>
                        handleVariantChange(index, "is_active", event.target.checked)
                      }
                    />
                    Bán
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-6 rounded-2xl text-red-600"
                    disabled={variants.length === 1}
                    onClick={() => removeVariant(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-zinc-200 p-5">
            <h3 className="text-sm font-black uppercase tracking-[0.16em]">Hình ảnh</h3>
            <div>
              <Label htmlFor="image">Link ảnh sản phẩm</Label>
              <Input
                id="image"
                value={formData.image}
                onChange={(event) => handleInputChange("image", event.target.value)}
                placeholder="https://example.com/image.jpg"
                className="h-12 text-base"
              />
            </div>

            <div>
              <Label htmlFor="imageFiles">Upload ảnh sản phẩm</Label>
              <Input
                id="imageFiles"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="h-12 text-base"
                onChange={(event) => handleImageFilesChange(event.target.files)}
              />
              <p className="mt-1 text-xs text-zinc-500">
                Dán link ảnh hoặc dùng ảnh đã upload trong Supabase Storage. JPEG, PNG hoặc WebP, tối đa 5MB mỗi ảnh.
              </p>
              {errors.imageFiles && <p className="mt-1 text-sm text-rose-600">{errors.imageFiles}</p>}
            </div>

            {previewUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                {previewUrls.map((url, index) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setPrimaryImageIndex(index)}
                    className={`overflow-hidden border text-left ${
                      primaryImageIndex === index ? "border-zinc-950" : "border-zinc-200"
                    }`}
                  >
                    <img
                      src={url}
                      alt={`Upload preview ${index + 1}`}
                      className="aspect-square w-full object-cover"
                    />
                    <span className="block px-2 py-1 text-[10px] uppercase tracking-wide">
                      {primaryImageIndex === index ? "Ảnh chính" : "Chọn ảnh chính"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <DialogFooter>
            {errors.submit && <p className="mr-auto text-sm text-rose-600">{errors.submit}</p>}
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="h-12 px-6 text-base">
              Hủy
            </Button>
            <Button type="submit" disabled={loading} className="h-12 bg-black px-6 text-base text-white hover:bg-zinc-800">
              {loading ? "Đang lưu..." : product ? "Cập nhật" : "Tạo sản phẩm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
