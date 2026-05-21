"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

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
  color: "Brown",
  sku: "",
  stock: "0",
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
  const colors = product.colors && product.colors.length > 0 ? product.colors : ["Brown"];
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
        image: "",
        stock: "",
        sku: "",
        category_id: "no-category",
        sizes: "S, M, L, XL",
        colors: "Brown, Green, Black",
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

    if (!formData.title.trim()) newErrors.title = "Tên sản phẩm là bắt buộc";
    if (formData.slug.trim() && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formData.slug.trim())) {
      newErrors.slug = "Slug chỉ dùng chữ thường, số và dấu gạch ngang";
    }
    if (!formData.description.trim()) newErrors.description = "Mô tả là bắt buộc";

    const price = Number.parseFloat(formData.price);
    if (!formData.price.trim()) {
      newErrors.price = "Giá là bắt buộc";
    } else if (Number.isNaN(price) || price <= 0) {
      newErrors.price = "Giá phải lớn hơn 0";
    }

    if (variants.length === 0) {
      newErrors.variants = "Cần ít nhất một variant size/màu";
    }

    const variantKeys = new Set<string>();
    variants.forEach((variant, index) => {
      if (!variant.size.trim()) newErrors[`variant-${index}-size`] = "Thiếu size";
      if (!variant.color.trim()) newErrors[`variant-${index}-color`] = "Thiếu màu";

      const stock = Number.parseInt(variant.stock, 10);
      if (Number.isNaN(stock) || stock < 0) {
        newErrors[`variant-${index}-stock`] = "Stock phải >= 0";
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

      await syncAdminProductVariantsAction(savedProduct.product_id, variantPayload);

      if (selectedFiles.length > 0) {
        const uploadedImages = await uploadAndAttachProductImages(
          savedProduct.product_id,
          selectedFiles,
          primaryImageIndex,
        );
        const uploadedPrimaryImage = uploadedImages[primaryImageIndex]?.url;
        if (uploadedPrimaryImage) {
          await updateAdminProductAction(savedProduct.product_id, {
            image: uploadedPrimaryImage,
          });
        }
      }

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
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-none">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {product
              ? "Cập nhật thông tin, ảnh và tồn kho variant."
              : "Tạo sản phẩm mới với size, màu và tồn kho thật."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="space-y-4 border border-zinc-200 p-4">
            <h3 className="text-sm font-black uppercase tracking-[0.16em]">
              Thông tin cơ bản
            </h3>
            <div>
              <Label htmlFor="title">Tên sản phẩm *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(event) => handleInputChange("title", event.target.value)}
                placeholder="RESEY Washed Tee"
                className={errors.title ? "border-rose-500" : ""}
              />
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
                  className={errors.slug ? "border-rose-500" : ""}
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
                rows={3}
                className={`w-full rounded-none border px-3 py-2 focus:outline-none ${
                  errors.description ? "border-rose-500" : "border-zinc-300"
                }`}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-rose-600">{errors.description}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="price">Giá VND *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  value={formData.price}
                  onChange={(event) => handleInputChange("price", event.target.value)}
                  placeholder="450000"
                  className={errors.price ? "border-rose-500" : ""}
                />
                {errors.price && <p className="mt-1 text-sm text-rose-600">{errors.price}</p>}
              </div>

              <div>
                <Label htmlFor="sku">SKU gốc</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(event) => handleInputChange("sku", event.target.value)}
                  placeholder="RESEY-TEE-001"
                />
              </div>

              <div>
                <Label htmlFor="category">Danh mục</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => handleInputChange("category_id", value || "")}
                  disabled={categoriesLoading || !!categoriesError}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn danh mục" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-category">Không phân loại</SelectItem>
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
                    className="mt-2 rounded-none"
                    onClick={() => void refetchCategories()}
                  >
                    Tải lại danh mục
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="sizes">Sizes</Label>
                <Input
                  id="sizes"
                  value={formData.sizes}
                  onChange={(event) => handleInputChange("sizes", event.target.value)}
                  placeholder="S, M, L, XL"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Nhập cách nhau bằng dấu phẩy. Variant bên dưới vẫn là nguồn tồn kho chính.
                </p>
              </div>

              <div>
                <Label htmlFor="colors">Màu</Label>
                <Input
                  id="colors"
                  value={formData.colors}
                  onChange={(event) => handleInputChange("colors", event.target.value)}
                  placeholder="Brown, Green, Black"
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
          </section>

          <section className="space-y-4 border border-zinc-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.16em]">
                  Variant inventory
                </h3>
                <p className="text-xs text-zinc-500">
                  Tồn kho tổng hiện tại: {getVariantTotalStock()} sản phẩm
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                <Plus className="mr-2 h-4 w-4" />
                Thêm variant
              </Button>
            </div>

            {errors.variants && <p className="text-sm text-rose-600">{errors.variants}</p>}

            <div className="space-y-3">
              {variants.map((variant, index) => (
                <div
                  key={`${variant.id || "new"}-${index}`}
                  className="grid gap-3 border border-zinc-100 p-3 md:grid-cols-[1fr_1fr_1.2fr_0.8fr_1fr_auto_auto]"
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
                      placeholder="Brown"
                      className={errors[`variant-${index}-color`] ? "border-rose-500" : ""}
                    />
                  </div>
                  <div>
                    <Label>SKU variant</Label>
                    <Input
                      value={variant.sku}
                      onChange={(event) => handleVariantChange(index, "sku", event.target.value)}
                      placeholder="RESEY-TEE-M-BROWN"
                    />
                  </div>
                  <div>
                    <Label>Stock</Label>
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
                    className="mt-6 rounded-none text-red-600"
                    disabled={variants.length === 1}
                    onClick={() => removeVariant(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4 border border-zinc-200 p-4">
            <h3 className="text-sm font-black uppercase tracking-[0.16em]">Hình ảnh</h3>
            <div>
              <Label htmlFor="image">Image URL dự phòng</Label>
              <Input
                id="image"
                value={formData.image}
                onChange={(event) => handleInputChange("image", event.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div>
              <Label htmlFor="imageFiles">Upload product images</Label>
              <Input
                id="imageFiles"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => handleImageFilesChange(event.target.files)}
              />
              <p className="mt-1 text-xs text-zinc-500">
                JPEG, PNG hoặc WebP, tối đa 5MB mỗi ảnh. Click ảnh preview để chọn ảnh chính.
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
                      {primaryImageIndex === index ? "Primary" : "Set primary"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <DialogFooter>
            {errors.submit && <p className="mr-auto text-sm text-rose-600">{errors.submit}</p>}
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Đang lưu..." : product ? "Cập nhật" : "Tạo sản phẩm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
