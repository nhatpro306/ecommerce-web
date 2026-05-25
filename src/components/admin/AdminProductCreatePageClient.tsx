"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type ChangeEvent, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, ImagePlus, Loader2, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCategories } from "@/hooks/queries/use-categories";
import { uploadProductImage } from "@/services/storage/productImageUpload";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  activateAdminProductAction,
  createAdminProductAction,
  syncAdminProductImagesAction,
  syncAdminProductVariantsAction,
  validateProductPublishReadinessAction,
  type AdminVariantInput,
} from "@/app/admin/products/actions";

type ProductKind = "simple" | "classified";

type VariantDraft = {
  id: string;
  color: string;
  size: string;
  stock: string;
  sku: string;
  price: string;
  isActive: boolean;
};

type UploadedImage = {
  id: string;
  url: string;
  name: string;
  isPrimary: boolean;
  file?: File;
};

type ChecklistItem = {
  label: string;
  done: boolean;
  help: string;
};

const emptyVariant = (color = "", size = ""): VariantDraft => ({
  id: crypto.randomUUID(),
  color,
  size,
  stock: "",
  sku: "",
  price: "",
  isActive: true,
});

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const parseNumber = (value: string) => Number(value.replace(/[^\d]/g, "") || "0");
const isDemoName = (name: string) => /\b(test|demo|sample|dummy|fake)\b/i.test(name);

export function AdminProductCreatePageClient() {
  const router = useRouter();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();

  const [productKind, setProductKind] = useState<ProductKind>("simple");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [material, setMaterial] = useState("");
  const [description, setDescription] = useState("");
  const [stock, setStock] = useState("");
  const [sku, setSku] = useState("");
  const [sellingStatus, setSellingStatus] = useState<"selling" | "hidden">("selling");
  const [newColor, setNewColor] = useState("");
  const [newSize, setNewSize] = useState("");
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const generatedSlug = slug || slugify(name);
  const priceNumber = parseNumber(price);
  const salePriceNumber = salePrice ? parseNumber(salePrice) : null;
  const selectedCategory = categories.find((category) => String(category.id) === categoryId);
  const isClassified = productKind === "classified";
  const activeVariants = variants.filter((variant) => variant.isActive);
  const activeVariantStock = activeVariants.reduce((sum, variant) => sum + parseNumber(variant.stock), 0);
  const simpleStock = parseNumber(stock);
  const totalStock = isClassified ? activeVariantStock : simpleStock;
  const primaryImage = images.find((image) => image.isPrimary) ?? images[0];

  const uniqueColors = useMemo(
    () => Array.from(new Set(variants.map((variant) => variant.color.trim()).filter(Boolean))),
    [variants],
  );
  const uniqueSizes = useMemo(
    () => Array.from(new Set(variants.map((variant) => variant.size.trim()).filter(Boolean))),
    [variants],
  );

  const activeVariantMissingStock = activeVariants.some((variant) => variant.stock.trim() === "");

  const checklist: ChecklistItem[] = [
    { label: "Tên sản phẩm", done: name.trim().length > 0, help: "Nhập tên để khách nhận diện sản phẩm." },
    { label: "Danh mục", done: Boolean(categoryId), help: "Chọn danh mục để khách dễ tìm sản phẩm." },
    { label: "Giá bán", done: priceNumber > 0, help: "Nhập giá bán hợp lệ bằng VND." },
    { label: "Ảnh sản phẩm", done: Boolean(primaryImage), help: "Tải ít nhất 1 ảnh để sản phẩm hiển thị đẹp ngoài shop." },
    isClassified
      ? { label: "Phân loại đang bán", done: activeVariants.length > 0, help: "Tạo ít nhất 1 màu/size đang bán." }
      : { label: "Tồn kho sản phẩm", done: stock.trim().length > 0, help: "Nhập tổng tồn kho để khách có thể mua sản phẩm." },
    isClassified
      ? {
          label: "Tồn kho phân loại",
          done: activeVariants.length > 0 && !activeVariantMissingStock && activeVariantStock > 0,
          help: "Nhập tồn kho cho các phân loại đang bán.",
        }
      : {
          label: "Sẵn sàng hiển thị ngoài shop",
          done: simpleStock > 0 && sellingStatus === "selling",
          help: "Sản phẩm cần còn hàng và ở trạng thái đang bán.",
        },
  ];

  const publishIssues = useMemo(() => {
    const issues: string[] = [];
    if (!name.trim()) issues.push("Vui lòng nhập tên sản phẩm.");
    if (!categoryId) issues.push("Vui lòng chọn danh mục.");
    if (priceNumber <= 0) issues.push("Vui lòng nhập giá bán hợp lệ.");
    if (!description.trim()) issues.push("Vui lòng nhập mô tả ngắn.");
    if (!primaryImage) issues.push("Vui lòng tải ít nhất 1 ảnh sản phẩm.");
    if (isDemoName(name)) issues.push("Không thể đăng bán sản phẩm test/demo.");

    if (isClassified) {
      if (activeVariants.length === 0) issues.push("Vui lòng tạo ít nhất 1 phân loại đang bán.");
      if (activeVariantMissingStock) issues.push("Vui lòng nhập tồn kho cho phân loại đang bán.");
      if (activeVariants.length > 0 && !activeVariantMissingStock && activeVariantStock <= 0) {
        issues.push("Tất cả phân loại đang hết hàng.");
      }
    } else {
      if (!stock.trim()) issues.push("Vui lòng nhập tồn kho sản phẩm.");
      if (stock.trim() && simpleStock <= 0) issues.push("Vui lòng nhập tồn kho hoặc tạo phân loại.");
    }

    if (sellingStatus !== "selling") issues.push("Sản phẩm đang tạm ẩn, chưa thể đăng bán.");
    return issues;
  }, [
    activeVariantMissingStock,
    activeVariantStock,
    activeVariants.length,
    categoryId,
    description,
    isClassified,
    name,
    priceNumber,
    primaryImage,
    sellingStatus,
    simpleStock,
    stock,
  ]);

  const canPublish = publishIssues.length === 0;

  const selectProductKind = (kind: ProductKind) => {
    if (productKind === kind) return;
    if (productKind === "classified" && kind === "simple" && variants.length > 0) {
      const confirmed = window.confirm("Chuyển sang sản phẩm đơn giản sẽ không dùng tồn kho theo màu/size nữa.");
      if (!confirmed) return;
    }
    setProductKind(kind);
  };

  const addColor = () => {
    const color = newColor.trim();
    if (!color) return;
    setVariants((current) => {
      const existingColors = new Set(current.map((variant) => variant.color.toLowerCase()));
      if (existingColors.has(color.toLowerCase())) return current;
      if (uniqueSizes.length === 0) return [...current, emptyVariant(color, "")];
      return [...current, ...uniqueSizes.map((size) => emptyVariant(color, size))];
    });
    setNewColor("");
  };

  const addSize = () => {
    const size = newSize.trim();
    if (!size) return;
    setVariants((current) => {
      const existingSizes = new Set(current.map((variant) => variant.size.toLowerCase()));
      if (existingSizes.has(size.toLowerCase())) return current;
      if (uniqueColors.length === 0) return [...current, emptyVariant("", size)];
      return [...current, ...uniqueColors.map((color) => emptyVariant(color, size))];
    });
    setNewSize("");
  };

  const updateVariant = (id: string, patch: Partial<VariantDraft>) => {
    setVariants((current) => current.map((variant) => (variant.id === id ? { ...variant, ...patch } : variant)));
  };

  const removeVariant = (id: string) => {
    setVariants((current) => current.filter((variant) => variant.id !== id));
  };

  const addImageFromUrl = () => {
    const url = imageUrl.trim();
    if (!url) return;
    setImages((current) => [...current, { id: crypto.randomUUID(), url, name: "Ảnh từ link", isPrimary: current.length === 0 }]);
    setImageUrl("");
  };

  const handleFiles = async (files: FileList | File[]) => {
    const selectedFiles = Array.from(files);
    if (selectedFiles.length === 0) return;
    setUploading(true);
    try {
      const uploaded = selectedFiles.map((file, index) => ({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(file),
        name: file.name,
        isPrimary: images.length === 0 && index === 0,
        file,
      }));
      setImages((current) => [...current, ...uploaded]);
      toast.success("Đã thêm ảnh xem trước. Ảnh sẽ được lưu khi tạo sản phẩm.");
    } catch {
      toast.error("Không thể tải ảnh lên. Vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    void handleFiles(event.dataTransfer.files);
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) void handleFiles(event.target.files);
  };

  const setPrimaryImage = (id: string) => {
    setImages((current) => current.map((image) => ({ ...image, isPrimary: image.id === id })));
  };

  const removeImage = (id: string) => {
    setImages((current) => {
      const next = current.filter((image) => image.id !== id);
      if (next.length > 0 && !next.some((image) => image.isPrimary)) next[0] = { ...next[0], isPrimary: true };
      return next;
    });
  };

  const buildVariantPayload = (): AdminVariantInput[] =>
    isClassified
      ? variants.map((variant) => ({
          id: variant.id,
          color: variant.color.trim() || "Một màu",
          size: variant.size.trim() || "Một size",
          stock: parseNumber(variant.stock),
          sku: variant.sku.trim() || undefined,
          price_override: variant.price ? parseNumber(variant.price) : null,
          is_active: variant.isActive,
        }))
      : [];

  const saveProduct = async (mode: "draft" | "publish") => {
    if (mode === "publish" && !canPublish) {
      publishIssues.forEach((issue) => toast.error(issue));
      toast.error("Không thể đăng bán vì sản phẩm còn thiếu thông tin.");
      return;
    }

    setSaving(mode);
    try {
      const productStock = isClassified ? activeVariantStock : simpleStock;
      const createdProduct = await createAdminProductAction({
        title: name.trim(),
        slug: generatedSlug,
        description: description.trim(),
        price: priceNumber,
        sale_price: salePriceNumber,
        image: primaryImage && !primaryImage.file ? primaryImage.url : "",
        category_id: categoryId ? Number(categoryId) : undefined,
        material: material.trim() || undefined,
        sku: sku.trim() || undefined,
        stock: productStock,
        sizes: isClassified ? uniqueSizes : [],
        colors: isClassified ? uniqueColors : [],
        is_active: false,
      });

      const productId = createdProduct.product_id;

      const normalizedVariants = buildVariantPayload();
      if (isClassified && normalizedVariants.length > 0) {
        await syncAdminProductVariantsAction(productId, normalizedVariants);
      }

      if (images.length > 0) {
        const syncedImages = [];
        for (const [index, image] of images.entries()) {
          if (image.file) {
            setUploading(true);
            const uploaded = await uploadProductImage(productId, image.file);
            syncedImages.push({
              url: uploaded.url,
              alt_text: image.name || name.trim() || null,
              sort_order: index,
              is_primary: image.isPrimary,
            });
          } else {
            syncedImages.push({
              url: image.url,
              alt_text: image.name || name.trim() || null,
              sort_order: index,
              is_primary: image.isPrimary,
            });
          }
        }

        await syncAdminProductImagesAction(
          productId,
          syncedImages,
        );
      }

      if (mode === "publish") {
        const readiness = await validateProductPublishReadinessAction(productId);
        if (!readiness.ok) {
          readiness.reasons.forEach((issue) => toast.error(issue));
          return;
        }
        await activateAdminProductAction(productId);
      }

      toast.success(mode === "publish" ? "Đã đăng bán sản phẩm." : "Đã lưu nháp sản phẩm.");
      router.push("/admin/products");
      router.refresh();
    } catch (error) {
      console.error("Create product failed:", error);
      toast.error("Không thể lưu sản phẩm. Vui lòng thử lại.");
    } finally {
      setUploading(false);
      setSaving(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/admin/products" className="mb-3 inline-flex items-center text-sm font-medium text-zinc-600 hover:text-zinc-950">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại sản phẩm
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">Tạo sản phẩm mới</h1>
          <p className="mt-2 text-sm text-muted-foreground">Thêm thông tin, ảnh, phân loại và đăng bán sản phẩm.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin cơ bản</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Tên sản phẩm *</Label>
                <Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: RESEY Basic Tee" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Danh mục *</Label>
                  <Select value={categoryId} onValueChange={(value) => setCategoryId(value ?? "")} disabled={categoriesLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!categoryId ? <p className="text-sm text-amber-600">Vui lòng chọn danh mục trước khi đăng bán.</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="material">Chất liệu</Label>
                  <Input id="material" value={material} onChange={(event) => setMaterial(event.target.value)} placeholder="Cotton washed 260gsm" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Giá bán *</Label>
                  <Input id="price" inputMode="numeric" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="450000" />
                  <p className="text-sm text-muted-foreground">Nhập giá bằng VND, ví dụ: 450000</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sale-price">Giá khuyến mãi</Label>
                  <Input id="sale-price" inputMode="numeric" value={salePrice} onChange={(event) => setSalePrice(event.target.value)} placeholder="Có thể để trống" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Mô tả ngắn *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Mô tả chất liệu, form dáng, phong cách..."
                  className="min-h-36"
                />
              </div>

              <div className="rounded-2xl border bg-muted/30 p-4">
                <button type="button" onClick={() => setShowAdvanced((value) => !value)} className="text-sm font-medium">
                  Tùy chỉnh URL
                </button>
                {showAdvanced ? (
                  <div className="mt-3 space-y-2">
                    <Label htmlFor="slug">Đường dẫn sản phẩm</Label>
                    <Input id="slug" value={slug} onChange={(event) => setSlug(slugify(event.target.value))} placeholder={slugify(name) || "resey-basic-tee"} />
                    <p className="text-sm text-muted-foreground">Có thể để trống, hệ thống sẽ tự tạo từ tên sản phẩm.</p>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Loại sản phẩm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => selectProductKind("simple")}
                  className={`rounded-2xl border p-5 text-left transition ${productKind === "simple" ? "border-black bg-black text-white" : "bg-white hover:border-black"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">Sản phẩm đơn giản</h3>
                      <p className={`mt-2 text-sm ${productKind === "simple" ? "text-white/80" : "text-muted-foreground"}`}>
                        Dùng khi sản phẩm không có màu/size riêng. Chỉ cần nhập tổng tồn kho.
                      </p>
                    </div>
                    {productKind === "simple" ? <Check className="h-5 w-5" /> : null}
                  </div>
                  <p className={`mt-4 text-sm ${productKind === "simple" ? "text-white/70" : "text-muted-foreground"}`}>
                    Ví dụ: Một mẫu túi, một phụ kiện, hoặc sản phẩm chỉ có 1 kiểu.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => selectProductKind("classified")}
                  className={`rounded-2xl border p-5 text-left transition ${productKind === "classified" ? "border-black bg-black text-white" : "bg-white hover:border-black"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">Sản phẩm có phân loại</h3>
                      <p className={`mt-2 text-sm ${productKind === "classified" ? "text-white/80" : "text-muted-foreground"}`}>
                        Dùng khi sản phẩm có nhiều màu, size hoặc tồn kho riêng cho từng lựa chọn.
                      </p>
                    </div>
                    {productKind === "classified" ? <Check className="h-5 w-5" /> : null}
                  </div>
                  <p className={`mt-4 text-sm ${productKind === "classified" ? "text-white/70" : "text-muted-foreground"}`}>
                    Ví dụ: Áo có size S/M/L và màu Brown/Black.
                  </p>
                </button>
              </div>

              {!isClassified ? (
                <div className="rounded-2xl border p-5">
                  <h3 className="text-lg font-semibold">Tồn kho sản phẩm</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Dùng khi sản phẩm không có nhiều màu/size. Khách có thể thêm vào giỏ ngay nếu còn hàng.
                  </p>
                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="stock">Tổng tồn kho *</Label>
                      <Input id="stock" inputMode="numeric" value={stock} onChange={(event) => setStock(event.target.value)} placeholder="10" />
                      {!stock.trim() ? <p className="text-sm text-amber-600">Vui lòng nhập tồn kho sản phẩm.</p> : null}
                      {stock.trim() && simpleStock === 0 ? (
                        <p className="text-sm text-amber-600">Sản phẩm đang hết hàng. Bạn vẫn có thể lưu nháp nhưng chưa nên đăng bán.</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU nội bộ</Label>
                      <Input id="sku" value={sku} onChange={(event) => setSku(event.target.value)} placeholder="Có thể để trống" />
                      <p className="text-sm text-muted-foreground">Có thể để trống, hệ thống sẽ gợi ý mã SKU.</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Trạng thái bán</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button type="button" variant={sellingStatus === "selling" ? "default" : "outline"} onClick={() => setSellingStatus("selling")}>
                          Đang bán
                        </Button>
                        <Button type="button" variant={sellingStatus === "hidden" ? "default" : "outline"} onClick={() => setSellingStatus("hidden")}>
                          Tạm ẩn
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border p-5">
                  <h3 className="text-lg font-semibold">Màu sắc, size & tồn kho</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Dùng khi mỗi màu/size có tồn kho riêng. Ví dụ: Brown size M còn 5 cái, Brown size L còn 2 cái.
                  </p>

                  <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_auto]">
                    <Input value={newColor} onChange={(event) => setNewColor(event.target.value)} placeholder="Thêm màu mới, ví dụ: Brown" />
                    <Button type="button" variant="outline" onClick={addColor}>
                      + Thêm màu
                    </Button>
                    <Input value={newSize} onChange={(event) => setNewSize(event.target.value)} placeholder="Thêm size mới, ví dụ: M" />
                    <Button type="button" variant="outline" onClick={addSize}>
                      + Thêm size
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setVariants((current) => [...current, emptyVariant()])}>
                      Tạo phân loại
                    </Button>
                  </div>

                  <div className="mt-5 hidden overflow-x-auto rounded-2xl border md:block">
                    <table className="w-full min-w-[780px] text-sm">
                      <thead className="bg-muted/60 text-left">
                        <tr>
                          <th className="px-4 py-3 font-medium">Màu</th>
                          <th className="px-4 py-3 font-medium">Size</th>
                          <th className="px-4 py-3 font-medium">Tồn kho</th>
                          <th className="px-4 py-3 font-medium">SKU</th>
                          <th className="px-4 py-3 font-medium">Giá riêng nếu có</th>
                          <th className="px-4 py-3 font-medium">Đang bán</th>
                          <th className="px-4 py-3 font-medium">Xóa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variants.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                              Thêm màu và size để tạo phân loại.
                            </td>
                          </tr>
                        ) : (
                          variants.map((variant) => (
                            <tr key={variant.id} className="border-t">
                              <td className="px-4 py-3">
                                <Input value={variant.color} onChange={(event) => updateVariant(variant.id, { color: event.target.value })} placeholder="Brown" />
                              </td>
                              <td className="px-4 py-3">
                                <Input value={variant.size} onChange={(event) => updateVariant(variant.id, { size: event.target.value })} placeholder="M" />
                              </td>
                              <td className="px-4 py-3">
                                <Input inputMode="numeric" value={variant.stock} onChange={(event) => updateVariant(variant.id, { stock: event.target.value })} placeholder="5" />
                              </td>
                              <td className="px-4 py-3">
                                <Input value={variant.sku} onChange={(event) => updateVariant(variant.id, { sku: event.target.value })} placeholder="Tuỳ chọn" />
                              </td>
                              <td className="px-4 py-3">
                                <Input inputMode="numeric" value={variant.price} onChange={(event) => updateVariant(variant.id, { price: event.target.value })} placeholder="Tuỳ chọn" />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={variant.isActive}
                                  onChange={(event) => updateVariant(variant.id, { isActive: event.target.checked })}
                                  className="h-4 w-4"
                                  aria-label="Đang bán"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeVariant(variant.id)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-5 space-y-3 md:hidden">
                    {variants.length === 0 ? (
                      <div className="rounded-2xl border p-4 text-center text-sm text-muted-foreground">Thêm màu và size để tạo phân loại.</div>
                    ) : (
                      variants.map((variant) => (
                        <div key={variant.id} className="rounded-2xl border p-4">
                          <div className="grid gap-3">
                            <Input value={variant.color} onChange={(event) => updateVariant(variant.id, { color: event.target.value })} placeholder="Màu" />
                            <Input value={variant.size} onChange={(event) => updateVariant(variant.id, { size: event.target.value })} placeholder="Size" />
                            <Input inputMode="numeric" value={variant.stock} onChange={(event) => updateVariant(variant.id, { stock: event.target.value })} placeholder="Tồn kho" />
                            <Input value={variant.sku} onChange={(event) => updateVariant(variant.id, { sku: event.target.value })} placeholder="SKU" />
                            <Input inputMode="numeric" value={variant.price} onChange={(event) => updateVariant(variant.id, { price: event.target.value })} placeholder="Giá riêng nếu có" />
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={variant.isActive}
                                  onChange={(event) => updateVariant(variant.id, { isActive: event.target.checked })}
                                />
                                Đang bán
                              </label>
                              <Button type="button" variant="ghost" size="sm" onClick={() => removeVariant(variant.id)}>
                                Xóa
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ảnh sản phẩm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-muted-foreground">Nên dùng ảnh 4:5 hoặc 1:1, dưới 5MB. Hỗ trợ JPEG, PNG, WebP.</p>
              <div onDrop={onDrop} onDragOver={(event) => event.preventDefault()} className="rounded-2xl border border-dashed p-8 text-center">
                <ImagePlus className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 font-medium">Kéo thả ảnh vào đây hoặc bấm để chọn ảnh</p>
                <p className="mt-1 text-sm text-muted-foreground">{uploading ? "Đang tải ảnh lên..." : "Ảnh sẽ hiển thị ngay để chọn ảnh chính."}</p>
                <Input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onFileChange} className="mx-auto mt-4 max-w-sm" />
              </div>

              <div className="flex gap-2">
                <Input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Dán link ảnh sản phẩm" />
                <Button type="button" variant="outline" onClick={addImageFromUrl}>
                  Thêm
                </Button>
              </div>

              {images.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {images.map((image) => (
                    <div key={image.id} className="overflow-hidden rounded-2xl border">
                      <div className="relative aspect-[4/5] bg-muted">
                        <Image src={image.url} alt={image.name} fill className="object-cover" unoptimized />
                      </div>
                      <div className="flex items-center justify-between gap-2 p-2">
                        <Button type="button" variant={image.isPrimary ? "default" : "outline"} size="sm" onClick={() => setPrimaryImage(image.id)}>
                          {image.isPrimary ? "Ảnh chính" : "Chọn chính"}
                        </Button>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeImage(image.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Kiểm tra trước khi đăng bán</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {checklist.map((item) => (
                <div key={item.label} className="flex gap-3">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      item.done ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {item.done ? <Check className="h-3 w-3" /> : "!"}
                  </span>
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.help}</p>
                  </div>
                </div>
              ))}

              {!canPublish ? (
                <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
                  <p className="font-medium">Cần sửa trước khi đăng bán:</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {publishIssues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Xem trước</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-2xl border">
                <div className="relative aspect-[4/5] bg-muted">
                  {primaryImage ? <Image src={primaryImage.url} alt={name || "Ảnh sản phẩm"} fill className="object-cover" unoptimized /> : null}
                </div>
                <div className="space-y-2 p-4">
                  <p className="font-semibold">{name || "Tên sản phẩm"}</p>
                  <p className="text-sm text-muted-foreground">{selectedCategory?.name || "Chọn danh mục"}</p>
                  <p className="font-semibold">{priceNumber > 0 ? formatCurrency(priceNumber) : "Giá bán"}</p>
                  <p className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${totalStock > 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {isClassified ? `Tồn kho phân loại: ${totalStock}` : `Tổng tồn kho: ${totalStock}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="hidden gap-3 lg:grid">
            <Button type="button" variant="outline" disabled={saving !== null} onClick={() => saveProduct("draft")}>
              {saving === "draft" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Lưu nháp
            </Button>
            <Button type="button" disabled={!canPublish || saving !== null} onClick={() => saveProduct("publish")}>
              {saving === "publish" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Đăng bán
            </Button>
            <Link href="/admin/products">
              <Button type="button" variant="ghost" className="w-full">
                Hủy
              </Button>
            </Link>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white p-3 shadow-lg lg:hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3">
          <Button type="button" variant="outline" disabled={saving !== null} onClick={() => saveProduct("draft")}>
            Lưu nháp
          </Button>
          <Button type="button" disabled={!canPublish || saving !== null} onClick={() => saveProduct("publish")}>
            Đăng bán
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AdminProductCreatePageClient;
