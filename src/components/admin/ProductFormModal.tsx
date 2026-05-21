"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CreateProductData,
  ProductWithDetails,
} from "@/services/admin/adminProductService";
import { useCategories } from "@/hooks/queries";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  uploadAndAttachProductImages,
  validateProductImageFile,
} from "@/services/storage/productImageUpload";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProductData) => Promise<void>;
  product?: ProductWithDetails | null;
  title: string;
}

interface FormData {
  title: string;
  description: string;
  price: string;
  image: string;
  stock: string;
  sku: string;
  category_id: string;
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
    description: "",
    price: "",
    image: "",
    stock: "",
    sku: "",
    category_id: "no-category",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);

  // Use the query hook to fetch categories
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
        description: product.description || "",
        price: product.price?.toString() || "",
        image: product.image || "",
        stock: product.stock?.toString() || "",
        sku: product.sku || "",
        category_id: product.category_id?.toString() || "no-category",
      });
    } else {
      setFormData({
        title: "",
        description: "",
        price: "",
        image: "",
        stock: "",
        sku: "",
        category_id: "no-category",
      });
    }
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (!formData.price.trim()) {
      newErrors.price = "Price is required";
    } else {
      const price = parseFloat(formData.price);
      if (isNaN(price) || price <= 0) {
        newErrors.price = "Price must be a positive number";
      }
    }

    if (!formData.stock.trim()) {
      newErrors.stock = "Stock is required";
    } else {
      const stock = parseInt(formData.stock);
      if (isNaN(stock) || stock < 0) {
        newErrors.stock = "Stock must be a non-negative number";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      let uploadedPrimaryImage = formData.image.trim() || undefined;

      if (selectedFiles.length > 0) {
        if (!product?.product_id) {
          throw new Error("Save the product first, then upload product images.");
        }

        const uploadedImages = await uploadAndAttachProductImages(
          product.product_id,
          selectedFiles,
          primaryImageIndex,
        );
        uploadedPrimaryImage =
          uploadedImages[primaryImageIndex]?.url || uploadedPrimaryImage;
      }

      const submitData: CreateProductData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        image: uploadedPrimaryImage,
        stock: parseInt(formData.stock),
        sku: formData.sku.trim() || undefined,
        category_id:
          formData.category_id && formData.category_id !== "no-category"
            ? parseInt(formData.category_id)
            : undefined,
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error("Error submitting product:", error);
      setErrors((previous) => ({
        ...previous,
        submit:
          error instanceof Error
            ? error.message
            : "Failed to save product. Please try again.",
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {product ? "Edit product details" : "Create a new product"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Product Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="Enter product title"
              className={
                errors.title
                  ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500"
                  : ""
              }
            />
            {errors.title && (
              <p className="mt-1 text-sm text-rose-600">{errors.title}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Enter product description"
              rows={3}
              className={`w-full rounded-md border px-3 py-2 focus:ring-2 focus:outline-none ${
                errors.description
                  ? "border-rose-500 focus:ring-rose-500"
                  : "border-slate-300 focus:ring-blue-500"
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-rose-600">{errors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Price ($) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => handleInputChange("price", e.target.value)}
                placeholder="0.00"
                className={
                  errors.price
                    ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500"
                    : ""
                }
              />
              {errors.price && (
                <p className="mt-1 text-sm text-rose-600">{errors.price}</p>
              )}
            </div>

            <div>
              <Label htmlFor="stock">Stock *</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => handleInputChange("stock", e.target.value)}
                placeholder="0"
                className={
                  errors.stock
                    ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500"
                    : ""
                }
              />
              {errors.stock && (
                <p className="mt-1 text-sm text-rose-600">{errors.stock}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              value={formData.sku}
              onChange={(e) => handleInputChange("sku", e.target.value)}
              placeholder="Product SKU (optional)"
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            {categoriesError && (
              <div className="border-destructive/30 bg-destructive/10 mt-1 mb-2 space-y-2 rounded-md border p-2 text-sm">
                <p className="text-destructive">{categoriesError.message}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => void refetchCategories()}
                >
                  Retry categories
                </Button>
              </div>
            )}
            <Select
              value={formData.category_id}
              onValueChange={(value) =>
                handleInputChange("category_id", value ?? "")
              }
              disabled={categoriesLoading || !!categoriesError}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-category">No category</SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="image">Image URL</Label>
            <Input
              id="image"
              value={formData.image}
              onChange={(e) => handleInputChange("image", e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="space-y-3">
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
                JPEG, PNG, or WebP up to 5MB. For new products, create the
                product first, then edit it to upload images.
              </p>
              {errors.imageFiles && (
                <p className="mt-1 text-sm text-rose-600">{errors.imageFiles}</p>
              )}
            </div>

            {previewUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previewUrls.map((url, index) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setPrimaryImageIndex(index)}
                    className={`overflow-hidden border text-left ${
                      primaryImageIndex === index
                        ? "border-zinc-950"
                        : "border-zinc-200"
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
          </div>

          <DialogFooter>
            {errors.submit && (
              <p className="mr-auto text-sm text-rose-600">{errors.submit}</p>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : product ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
