"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, AlertTriangle, Upload, X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  createAdminProductAction,
  syncAdminProductVariantsAction,
  validateProductPublishReadinessAction,
  activateAdminProductAction,
  type AdminVariantInput,
} from "@/app/admin/products/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories } from "@/hooks/queries";
import {
  uploadAndAttachProductImages,
  validateProductImageFile,
} from "@/services/storage/productImageUpload";
import { formatCurrency } from "@/utils/formatCurrency";

type SellerState = "nhap" | "dang_ban" | "tam_an" | "can_sua";

type VariantDraft = {
  size: string;
  color: string;
  sku: string;
  stock: string;
  price_override: string;
  is_active: boolean;
};

const defaultVariant = (): VariantDraft => ({
  size: "M",
  color: "?en",
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

function looksLikeTestProduct(title: string, description: string) {
  const text = `${title} ${description}`.toLowerCase();
  return /(test|demo|sample|mock|aaa|123)/.test(text);
}

export default function AdminProductCreatePageClient() {
  const router = useRouter();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [useCustomSlug, setUseCustomSlug] = useState(false);
  const [description, setDescription] = useState("");
  const [material, setMaterial] = useState("");
  const [price, setPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [sku, setSku] = useState("");
  const [categoryId, setCategoryId] = useState("none");
  const [sizesText, setSizesText] = useState("S, M, L, XL");
  const [colorsText, setColorsText] = useState("?en, Tr?ng, Xam");
  const [baseStock, setBaseStock] = useState("0");
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [newColor, setNewColor] = useState("");
  const [newSize, setNewSize] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const computedSlug = useMemo(() => (useCustomSlug ? slug : slugify(name)), [useCustomSlug, slug, name]);

  const activeVariantStock = useMemo(
    () => variants.filter((v) => v.is_active).reduce((sum, v) => sum + Math.max(0, Number(v.stock) || 0), 0),
    [variants],
  );

  const hasVariants = variants.length > 0;
  const stockValue = Math.max(0, Number(baseStock) || 0);
  const sellableStock = hasVariants ? activeVariantStock : stockValue;

  const checklist = useMemo(() => {
    const items = [
      { key: "name", label: "Ten s?n ph?m", ok: name.trim().length > 0, hint: "Nh?p ten ro rang ?? khach d? nh?n di?n." },
      { key: "category", label: "Danh m?c", ok: categoryId !== "none", hint: "Ch?n danh m?c ?? khach d? tim s?n ph?m." },
      { key: "price", label: "Gia ban", ok: Number(price) > 0, hint: "Nh?p gia ban h?p l? l?n h?n 0." },
      {
        key: "image",
        label: "?nh s?n ph?m",
        ok: selectedFiles.length > 0,
        hint: "T?i it nh?t 1 ?nh ?? s?n ph?m hi?n th? ??p ngoai shop.",
      },
      {
        key: "stock",
        label: "T?n kho / bi?n th?",
        ok: sellableStock > 0,
        hint: "Nh?p t?n kho t?ng ho?c t?o bi?n th? theo size/mau.",
      },
      {
        key: "public",
        label: "S?n sang hi?n th? ngoai shop",
        ok:
          name.trim().length > 0 &&
          categoryId !== "none" &&
          Number(price) > 0 &&
          selectedFiles.length > 0 &&
          sellableStock > 0 &&
          !looksLikeTestProduct(name, description),
        hint: "S?n ph?m ph?i ?? d? li?u tr??c khi ??ng ban.",
      },
    ];

    return items;
  }, [name, categoryId, price, selectedFiles.length, sellableStock, description]);

  const missingPublishReasons = useMemo(() => {
    const reasons: string[] = [];
    if (!name.trim()) reasons.push("Vui long nh?p ten s?n ph?m.");
    if (categoryId === "none") reasons.push("Vui long ch?n danh m?c.");
    if (!(Number(price) > 0)) reasons.push("Vui long nh?p gia ban h?p l?.");
    if (selectedFiles.length === 0) reasons.push("Vui long t?i it nh?t 1 ?nh s?n ph?m.");
    if (!(sellableStock > 0)) reasons.push("Vui long nh?p t?n kho ho?c t?o bi?n th?.");
    if (looksLikeTestProduct(name, description)) {
      reasons.push("Khong th? ??ng ban s?n ph?m test/demo.");
    }
    return reasons;
  }, [name, categoryId, price, selectedFiles.length, sellableStock, description]);

  const sellerState: SellerState = useMemo(() => {
    if (missingPublishReasons.length > 0 && (name || description || price || selectedFiles.length > 0)) return "can_sua";
    if (missingPublishReasons.length === 0) return "dang_ban";
    return "nhap";
  }, [missingPublishReasons, name, description, price, selectedFiles.length]);

  const addVariant = () => setVariants((prev) => [...prev, defaultVariant()]);

  const addColorVariants = () => {
    const color = newColor.trim();
    if (!color) return;
    const sizes = parseList(sizesText);
    if (sizes.length === 0) {
      toast.error("Vui long nh?p size tr??c khi t?o bi?n th?.");
      return;
    }
    setVariants((prev) => [
      ...prev,
      ...sizes.map((size) => ({
        size,
        color,
        sku: sku ? `${sku}-${color}-${size}`.toUpperCase() : "",
        stock: "0",
        price_override: "",
        is_active: true,
      })),
    ]);
    setNewColor("");
  };

  const addSizeVariants = () => {
    const size = newSize.trim();
    if (!size) return;
    const colors = parseList(colorsText);
    if (colors.length === 0) {
      toast.error("Vui long nh?p mau tr??c khi t?o bi?n th?.");
      return;
    }
    setVariants((prev) => [
      ...prev,
      ...colors.map((color) => ({
        size,
        color,
        sku: sku ? `${sku}-${color}-${size}`.toUpperCase() : "",
        stock: "0",
        price_override: "",
        is_active: true,
      })),
    ]);
    setNewSize("");
  };

  const updateVariant = (index: number, field: keyof VariantDraft, value: string | boolean) => {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  };

  const removeVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const onFilesSelected = (files: FileList | null) => {
    const next = Array.from(files || []);
    const err = next.map((f) => validateProductImageFile(f)).find(Boolean);
    if (err) {
      toast.error(err as string);
      return;
    }

    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    const nextPreviews = next.map((file) => URL.createObjectURL(file));
    setSelectedFiles(next);
    setPreviewUrls(nextPreviews);
    setPrimaryImageIndex(0);
  };

  const onDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    onFilesSelected(event.dataTransfer.files);
  };

  const save = async (mode: "draft" | "publish") => {
    setLoading(true);
    setErrors([]);

    try {
      if (mode === "publish" && missingPublishReasons.length > 0) {
        setErrors(missingPublishReasons.concat(["Khong th? ??ng ban vi s?n ph?m con thi?u thong tin."]));
        toast.error("Khong th? ??ng ban vi s?n ph?m con thi?u thong tin.");
        return;
      }

      const normalizedVariants = variants
        .map((variant) => ({
          size: variant.size.trim(),
          color: variant.color.trim(),
          sku: variant.sku.trim() || null,
          stock: Number(variant.stock) || 0,
          price_override: variant.price_override.trim() ? Number(variant.price_override) : null,
          is_active: variant.is_active,
        }))
        .filter((variant) => variant.size && variant.color);

      if (hasVariants && normalizedVariants.some((v) => v.stock < 0)) {
        toast.error("Vui long nh?p t?n kho cho bi?n th?.");
        return;
      }

      const createPayload = {
        title: name.trim(),
        slug: computedSlug || slugify(name),
        description: description.trim(),
        material: material.trim() || undefined,
        price: Number(price) || 0,
        sale_price: salePrice.trim() ? Number(salePrice) : null,
        image: undefined,
        stock: hasVariants ? activeVariantStock : stockValue,
        sku: sku.trim() || undefined,
        category_id: categoryId !== "none" ? Number(categoryId) : undefined,
        sizes: parseList(sizesText),
        colors: parseList(colorsText),
        is_active: false,
      };

      const product = await createAdminProductAction(createPayload);

      if (!product?.product_id) {
        throw new Error("Khong th? t?o s?n ph?m.");
      }

      if (normalizedVariants.length > 0) {
        const payload: AdminVariantInput[] = normalizedVariants.map((v) => ({
          size: v.size,
          color: v.color,
          sku: v.sku,
          stock: v.stock,
          price_override: v.price_override,
          image_url: null,
          is_active: v.is_active,
        }));
        await syncAdminProductVariantsAction(product.product_id, payload);
      }

      if (selectedFiles.length > 0) {
        setUploading(true);
        setUploadProgress(5);
        await uploadAndAttachProductImages(product.product_id, selectedFiles, primaryImageIndex, (progress) => {
          setUploadProgress(progress);
        });
        setUploading(false);
      }

      if (mode === "publish") {
        const readiness = await validateProductPublishReadinessAction(product.product_id);
        if (!readiness.ok) {
          setErrors(readiness.reasons.concat(["Khong th? ??ng ban vi s?n ph?m con thi?u thong tin."]));
          toast.error("Khong th? ??ng ban vi s?n ph?m con thi?u thong tin.");
          return;
        }
        await activateAdminProductAction(product.product_id);
        toast.success("??ng ban s?n ph?m thanh cong.");
      } else {
        toast.success("?a l?u s?n ph?m ? tr?ng thai nhap.");
      }
      router.push("/admin/products");
      router.refresh();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Khong th? l?u s?n ph?m.";
      toast.error(message);
      setErrors([message]);
    } finally {
      setLoading(false);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const primaryPreview = previewUrls[primaryImageIndex];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">T?o s?n ph?m m?i</h1>
        <p className="mt-2 text-zinc-600">Them thong tin, ?nh, bi?n th? va ??ng ban s?n ph?m.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <Card className="rounded-none">
            <CardHeader><CardTitle className="text-base">Thong tin c? b?n</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Ten s?n ph?m *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11" placeholder="RESEY Basic Tee" />
              </div>

              <details className="rounded-none border p-3">
                <summary className="cursor-pointer text-sm font-medium">Tuy ch?nh URL</summary>
                <div className="mt-3">
                  <Label>Slug URL</Label>
                  <Input
                    value={useCustomSlug ? slug : computedSlug}
                    onChange={(e) => {
                      setUseCustomSlug(true);
                      setSlug(slugify(e.target.value));
                    }}
                    placeholder="resey-basic-tee"
                  />
                </div>
              </details>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Danh m?c *</Label>
                  <Select value={categoryId} onValueChange={(value) => setCategoryId(value ?? "none")} disabled={categoriesLoading}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Ch?n danh m?c" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ch?n danh m?c</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {categoryId === "none" && (
                    <p className="mt-1 text-xs text-amber-600">Vui long ch?n danh m?c tr??c khi ??ng ban.</p>
                  )}
                </div>

                <div>
                  <Label>Ch?t li?u</Label>
                  <Input value={material} onChange={(e) => setMaterial(e.target.value)} className="h-11" placeholder="Cotton washed 260gsm" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>Gia ban *</Label>
                  <Input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="h-11" placeholder="450000" />
                  <p className="mt-1 text-xs text-zinc-500">Nh?p gia b?ng VND, vi d?: 450000</p>
                </div>
                <div>
                  <Label>Gia khuy?n mai</Label>
                  <Input type="number" min="0" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} className="h-11" placeholder="?? tr?ng n?u khong co" />
                </div>
                <div>
                  <Label>Ma SKU</Label>
                  <Input value={sku} onChange={(e) => setSku(e.target.value)} className="h-11" placeholder="Co th? ?? tr?ng" />
                  <p className="mt-1 text-xs text-zinc-500">Co th? ?? tr?ng, h? th?ng s? g?i y ma SKU.</p>
                </div>
              </div>

              <div>
                <Label>Mo t? ng?n *</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} placeholder="Mo t? ch?t li?u, fit, phong cach..." />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-none">
            <CardHeader><CardTitle className="text-base">?nh s?n ph?m</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-zinc-600">Nen dung ?nh 4:5 ho?c 1:1, d??i 5MB. H? tr? JPEG, PNG, WebP.</p>
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className="block cursor-pointer rounded-none border border-dashed border-zinc-300 p-6 text-center"
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => onFilesSelected(e.target.files)}
                />
                <Upload className="mx-auto mb-2 h-5 w-5 text-zinc-500" />
                <p className="font-medium">Keo th? ?nh vao ?ay ho?c b?m ?? ch?n ?nh</p>
                {uploading && (
                  <p className="mt-2 text-sm text-zinc-600">?ang t?i ?nh len... {uploadProgress}%</p>
                )}
              </label>

              {previewUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {previewUrls.map((url, index) => (
                    <div key={url} className="overflow-hidden border">
                      <button type="button" onClick={() => setPrimaryImageIndex(index)} className="block w-full text-left">
                        <img src={url} alt={`preview-${index + 1}`} className="aspect-[4/5] w-full object-cover" />
                      </button>
                      <div className="flex items-center justify-between gap-2 p-2">
                        <span className="text-xs font-medium">
                          {primaryImageIndex === index ? "?nh chinh" : "Ch?n ?nh chinh"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const nextFiles = selectedFiles.filter((_, i) => i !== index);
                            const nextUrls = previewUrls.filter((_, i) => i !== index);
                            setSelectedFiles(nextFiles);
                            setPreviewUrls(nextUrls);
                            setPrimaryImageIndex(0);
                          }}
                          className="text-rose-600"
                          aria-label="Xoa ?nh"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-none">
            <CardHeader><CardTitle className="text-base">Mau s?c, size & t?n kho</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-zinc-600">Vi d?: mau Brown co size S, M, L v?i t?n kho rieng.</p>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Danh sach size (cach nhau d?u ph?y)</Label>
                  <Input value={sizesText} onChange={(e) => setSizesText(e.target.value)} placeholder="S, M, L, XL" />
                </div>
                <div>
                  <Label>Danh sach mau (cach nhau d?u ph?y)</Label>
                  <Input value={colorsText} onChange={(e) => setColorsText(e.target.value)} placeholder="?en, Tr?ng, Xam" />
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-[1fr_auto_1fr_auto_auto] md:items-end">
                <Input value={newColor} onChange={(e) => setNewColor(e.target.value)} placeholder="Them mau m?i, vi d?: Brown" />
                <Button type="button" variant="outline" className="rounded-none" onClick={addColorVariants}>+ Mau</Button>
                <Input value={newSize} onChange={(e) => setNewSize(e.target.value)} placeholder="Them size m?i, vi d?: M" />
                <Button type="button" variant="outline" className="rounded-none" onClick={addSizeVariants}>+ Size</Button>
                <Button type="button" variant="outline" className="rounded-none" onClick={addVariant}><Plus className="mr-1 h-4 w-4" />T?o bi?n th?</Button>
              </div>

              {!hasVariants && (
                <div>
                  <Label>T?n kho t?ng</Label>
                  <Input type="number" min="0" value={baseStock} onChange={(e) => setBaseStock(e.target.value)} className="max-w-xs" />
                </div>
              )}

              {hasVariants && (
                <div className="overflow-x-auto border">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead className="bg-zinc-50">
                      <tr className="text-left">
                        <th className="px-3 py-2">Mau</th>
                        <th className="px-3 py-2">Size</th>
                        <th className="px-3 py-2">T?n kho</th>
                        <th className="px-3 py-2">SKU</th>
                        <th className="px-3 py-2">Gia rieng n?u co</th>
                        <th className="px-3 py-2">Tr?ng thai ban</th>
                        <th className="px-3 py-2">Xoa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((variant, index) => (
                        <tr key={`variant-${index}`} className="border-t">
                          <td className="px-3 py-2"><Input value={variant.color} onChange={(e) => updateVariant(index, "color", e.target.value)} /></td>
                          <td className="px-3 py-2"><Input value={variant.size} onChange={(e) => updateVariant(index, "size", e.target.value)} /></td>
                          <td className="px-3 py-2"><Input type="number" min="0" value={variant.stock} onChange={(e) => updateVariant(index, "stock", e.target.value)} /></td>
                          <td className="px-3 py-2"><Input value={variant.sku} onChange={(e) => updateVariant(index, "sku", e.target.value)} /></td>
                          <td className="px-3 py-2"><Input type="number" min="0" value={variant.price_override} onChange={(e) => updateVariant(index, "price_override", e.target.value)} /></td>
                          <td className="px-3 py-2"><label className="flex items-center gap-2"><input type="checkbox" checked={variant.is_active} onChange={(e) => updateVariant(index, "is_active", e.target.checked)} /><span>Ban</span></label></td>
                          <td className="px-3 py-2"><button type="button" onClick={() => removeVariant(index)} className="text-rose-600" aria-label="Xoa bi?n th?"><Trash2 className="h-4 w-4" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="rounded-none">
            <CardHeader><CardTitle className="text-base">Ki?m tra tr??c khi ??ng ban</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {checklist.map((item) => (
                <div key={item.key} className="flex items-start gap-2">
                  {item.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    {!item.ok && <p className="text-xs text-zinc-600">{item.hint}</p>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-none">
            <CardHeader><CardTitle className="text-base">Xem tr??c</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="relative aspect-[4/5] overflow-hidden bg-zinc-100">
                {primaryPreview ? (
                  <Image src={primaryPreview} alt="?nh xem tr??c" fill className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-500">Ch?a co ?nh</div>
                )}
              </div>
              <p className="font-bold">{name || "Ten s?n ph?m"}</p>
              <p className="text-sm text-zinc-600">{categories.find((c) => String(c.id) === categoryId)?.name || "Ch?n danh m?c"}</p>
              <p className="font-semibold">{Number(price) > 0 ? formatCurrency(Number(price)) : "Ch?a co gia"}</p>
              <p className="text-sm text-zinc-600">T?n kho: {sellableStock}</p>
              <p className="text-sm">
                Tr?ng thai: {sellerState === "dang_ban" ? "?ang ban" : sellerState === "can_sua" ? "C?n s?a" : "Nhap"}
              </p>
            </CardContent>
          </Card>

          {errors.length > 0 && (
            <Card className="rounded-none border-rose-200">
              <CardContent className="space-y-1 p-4 text-sm text-rose-700">
                {errors.map((error, index) => <p key={`${error}-${index}`}>- {error}</p>)}
              </CardContent>
            </Card>
          )}

          <div className="hidden gap-2 lg:grid">
            <Button variant="outline" className="rounded-none" disabled={loading} onClick={() => save("draft")}>L?u nhap</Button>
            <Button className="rounded-none bg-zinc-950 text-white hover:bg-zinc-800" disabled={loading || missingPublishReasons.length > 0} onClick={() => save("publish")}>??ng ban</Button>
            <Link href={computedSlug ? `/products/${computedSlug}` : "/products"}>
              <Button variant="outline" className="w-full rounded-none">Xem ngoai shop</Button>
            </Link>
            <Button variant="outline" className="rounded-none" onClick={() => router.push("/admin/products")}>H?y</Button>
          </div>
        </aside>
      </div>

      <div className="sticky bottom-0 left-0 right-0 z-20 border-t bg-white p-3 lg:hidden">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="rounded-none" disabled={loading} onClick={() => save("draft")}>L?u nhap</Button>
          <Button className="rounded-none bg-zinc-950 text-white hover:bg-zinc-800" disabled={loading || missingPublishReasons.length > 0} onClick={() => save("publish")}>??ng ban</Button>
        </div>
      </div>
    </div>
  );
}
