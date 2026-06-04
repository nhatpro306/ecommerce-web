"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, Minus, Plus, RotateCcw, Shield, ShoppingCart, Truck } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { useI18n } from "@/lib/i18n";
import { ProductType } from "@/types";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatCurrency";
import { getProductImage } from "@/utils/productImages";
import { useProducts } from "@/hooks/queries";
import { ProductCard } from "@/components/ProductCard";

type ProductDetailsClientProps = { product: ProductType };

export default function ProductDetailsClient({ product }: ProductDetailsClientProps) {
  const { addToCart } = useCart();
  const { t } = useI18n();
  const { data: allProducts = [] } = useProducts();
  const [quantity, setQuantity] = useState(1);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [activeImage, setActiveImage] = useState("");

  const activeVariants = useMemo(
    () => product.variants?.filter((variant) => variant.is_active) || [],
    [product.variants],
  );
  const isVariantProduct = activeVariants.length > 0;

  const availableColors = isVariantProduct
    ? Array.from(new Set(activeVariants.map((variant) => variant.color).filter(Boolean)))
    : [];

  const availableSizes = isVariantProduct
    ? Array.from(
        new Set(
          activeVariants
            .filter((variant) => !selectedColor || variant.color === selectedColor)
            .map((variant) => variant.size)
            .filter(Boolean),
        ),
      )
    : [];

  const selectedVariant = isVariantProduct
    ? activeVariants.find((variant) => variant.size === selectedSize && variant.color === selectedColor)
    : undefined;

  const currentStock = isVariantProduct ? selectedVariant?.stock ?? 0 : product.stock;
  const currentPrice = selectedVariant?.price_override ?? product.price;
  const productImage = getProductImage(product);

  const galleryImages = useMemo(() => {
    const imageSet = new Set<string>();
    imageSet.add(productImage);
    product.images
      ?.sort((left, right) => left.sort_order - right.sort_order)
      .forEach((image) => imageSet.add(image.url));
    activeVariants
      .map((variant) => variant.image_url)
      .filter((url): url is string => Boolean(url))
      .forEach((url) => imageSet.add(url));
    return Array.from(imageSet);
  }, [activeVariants, product.images, productImage]);

  const hasSizeOptions = isVariantProduct && availableSizes.length > 0;
  const hasColorOptions = isVariantProduct && availableColors.length > 0;

  const relatedProducts = useMemo(() => {
    const sameCategory = allProducts.filter(
      (item) =>
        item.product_id !== product.product_id &&
        item.category_id != null &&
        item.category_id === product.category_id,
    );
    if (sameCategory.length >= 2) return sameCategory.slice(0, 4);
    return allProducts.filter((item) => item.product_id !== product.product_id).slice(0, 4);
  }, [allProducts, product.product_id, product.category_id]);

  useEffect(() => {
    if (currentStock > 0 && quantity > currentStock) setQuantity(currentStock);
  }, [currentStock, quantity]);

  useEffect(() => {
    setActiveImage(selectedVariant?.image_url || productImage);
  }, [productImage, selectedVariant?.image_url]);

  useEffect(() => {
    if (selectedSize && isVariantProduct && !availableSizes.includes(selectedSize)) {
      setSelectedSize("");
    }
  }, [availableSizes, isVariantProduct, selectedSize]);

  const handleAddToCart = async () => {
    if (isVariantProduct && (!selectedColor || !selectedSize || !selectedVariant)) {
      return toast.error("Vui lòng chọn màu và size.");
    }
    if (currentStock <= 0) return toast.error(t("products.outOfStockError"));
    if (quantity > currentStock) return toast.error(t("products.quantityExceedsStock"));

    const added = await addToCart(
      { ...product, price: currentPrice, stock: currentStock },
      {
        size: isVariantProduct ? selectedSize || undefined : undefined,
        color: isVariantProduct ? selectedColor || undefined : undefined,
        quantity,
        variantId: selectedVariant?.id,
        sku: selectedVariant?.sku || product.sku || null,
      },
    );
    if (!added) return;

    setIsAddedToCart(true);
    window.setTimeout(() => setIsAddedToCart(false), 2000);
  };

  return (
    <div className="bg-white text-zinc-950">
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-10 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="relative aspect-[4/5] overflow-hidden bg-zinc-100">
            <Image src={activeImage || productImage} alt={product.title} fill priority className="object-cover" />
          </div>
          {galleryImages.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {galleryImages.map((image) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setActiveImage(image)}
                  className={`relative aspect-[4/5] overflow-hidden border ${(activeImage || productImage) === image ? "border-black" : "border-zinc-200"}`}
                >
                  <Image src={image} alt={`${product.title} thumbnail`} fill sizes="96px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-zinc-500">RESEY</p>
          <h1 className="text-4xl font-black uppercase leading-none md:text-5xl">{product.title}</h1>
          <p className="mt-5 text-2xl font-bold">{formatCurrency(currentPrice)}</p>
          <p className="mt-5 leading-7 text-zinc-600">{product.description}</p>

          <div className="mt-6 border-y border-zinc-200 py-5 text-sm">
            <div className="flex justify-between py-2">
              <span className="font-bold uppercase tracking-[0.14em]">{t("products.material")}</span>
              <span>{product.material || "Cotton blend"}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="font-bold uppercase tracking-[0.14em]">{t("products.stock")}</span>
              <span>{currentStock > 0 ? t("products.inStock") : t("products.outOfStock")}</span>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {isVariantProduct ? (
            <div>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em]">{t("products.selectColor")}</h2>
              <div className="flex flex-wrap gap-2">
                {availableColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      setSelectedColor(color);
                      setSelectedSize("");
                    }}
                    className={`min-w-12 border px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] ${
                      selectedColor === color
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-300 bg-white text-zinc-950 hover:border-zinc-950"
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
              {hasColorOptions && !selectedColor && (
                <p className="mt-2 text-xs text-zinc-500">{t("products.sizeSelectHint")}</p>
              )}
            </div>
            ) : null}

            {isVariantProduct ? (
            <div>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em]">{t("products.selectSize")}</h2>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((size) => {
                  const sizeVariant = activeVariants.find(
                    (variant) => variant.color === selectedColor && variant.size === size,
                  );
                  const disabled = activeVariants.length > 0
                    ? !selectedColor || !sizeVariant || sizeVariant.stock <= 0
                    : currentStock <= 0;
                  return (
                    <button
                      key={size}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectedSize(size)}
                      className={`border px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] ${
                        selectedSize === size
                          ? "border-zinc-950 bg-zinc-950 text-white"
                          : disabled
                            ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400"
                            : "border-zinc-300 bg-white text-zinc-950 hover:border-zinc-950"
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
              {hasSizeOptions && !selectedSize && (
                <p className="mt-2 text-xs text-zinc-500">
                  {selectedColor ? t("products.sizeSelectHintWithColor") : t("products.sizeSelectHintNoColor")}
                </p>
              )}
            </div>
            ) : null}

            {isVariantProduct && selectedColor && selectedSize && (
              <div className="border border-zinc-200 bg-zinc-50 p-3 text-sm font-semibold text-zinc-800">
                {currentStock <= 0
                  ? t("products.outOfStock")
                  : currentStock <= 3
                    ? t("products.stockFewLeft", undefined, { count: currentStock })
                    : t("products.inStock")}
                {selectedVariant?.sku ? ` / SKU: ${selectedVariant.sku}` : ""}
              </div>
            )}

            {!isVariantProduct ? (
              <div className="border border-zinc-200 bg-zinc-50 p-3 text-sm font-semibold text-zinc-800">
                {currentStock > 0 ? `Còn ${currentStock} sản phẩm` : "Hết hàng"}
              </div>
            ) : null}

            <div>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em]">{t("products.quantity")}</h2>
              <div className="inline-flex border border-zinc-300">
                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="flex h-12 w-12 items-center justify-center"><Minus className="h-4 w-4" /></button>
                <span className="flex h-12 w-14 items-center justify-center border-x border-zinc-300 text-sm font-bold">{quantity}</span>
                <button type="button" onClick={() => setQuantity((value) => Math.min(currentStock, value + 1))} className="flex h-12 w-12 items-center justify-center"><Plus className="h-4 w-4" /></button>
              </div>
            </div>

            <Button
              size="lg"
              className="h-14 w-full cursor-pointer rounded-none bg-zinc-950 text-xs font-bold uppercase tracking-[0.18em] text-white hover:bg-zinc-800 md:static md:h-14"
              disabled={currentStock <= 0 || (isVariantProduct && !selectedVariant)}
              onClick={handleAddToCart}
            >
              {currentStock <= 0 ? (
                t("products.outOfStock")
              ) : isAddedToCart ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {t("products.addedToCart")}
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {t("products.addToCart")} - {formatCurrency(currentPrice * quantity)}
                </>
              )}
            </Button>
            <div className="h-20 md:hidden" />
          </div>

          <div className="mt-8 grid gap-3 text-sm sm:grid-cols-3">
            {[
              [Truck, t("products.fastShipping"), t("products.fastShippingDesc")],
              [Shield, t("products.payment"), t("products.paymentDesc")],
              [RotateCcw, t("products.returnPolicy"), t("products.returnPolicyDesc")],
            ].map(([Icon, title, description]) => (
              <div key={String(title)} className="border border-zinc-200 p-4">
                <Icon className="mb-3 h-5 w-5" />
                <p className="font-bold uppercase tracking-[0.12em]">{String(title)}</p>
                <p className="mt-1 text-xs text-zinc-500">{String(description)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        <Button
          size="lg"
          className="h-12 w-full cursor-pointer rounded-none bg-zinc-950 text-xs font-bold uppercase tracking-[0.16em] text-white hover:bg-zinc-800"
          disabled={currentStock <= 0 || (isVariantProduct && !selectedVariant)}
          onClick={handleAddToCart}
        >
          {currentStock <= 0 ? t("products.outOfStock") : `${t("products.addToCart")} - ${formatCurrency(currentPrice * quantity)}`}
        </Button>
      </div>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-6 border-y border-zinc-200 py-8 md:grid-cols-2">
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em]">{t("products.description")}</h2>
            <p className="mt-4 leading-7 text-zinc-600">{product.description}</p>
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em]">{t("products.sizeGuide")}</h2>
            <div className="mt-4 grid grid-cols-4 gap-2 text-sm">
              <div className="font-bold">Size</div><div className="font-bold">Chest</div><div className="font-bold">Length</div><div className="font-bold">Shoulder</div>
              <div>S</div><div>52</div><div>68</div><div>48</div>
              <div>M</div><div>54</div><div>70</div><div>50</div>
              <div>L</div><div>56</div><div>72</div><div>52</div>
              <div>XL</div><div>58</div><div>74</div><div>54</div>
            </div>
            <p className="mt-3 text-xs text-zinc-500">Unit: cm, ±1-2cm tolerance.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-6 border-b border-zinc-200 pb-4">
          <h2 className="text-2xl font-black uppercase">{t("products.related")}</h2>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
          {relatedProducts.map((item) => <ProductCard key={item.product_id} product={item} />)}
        </div>
      </section>
    </div>
  );
}
