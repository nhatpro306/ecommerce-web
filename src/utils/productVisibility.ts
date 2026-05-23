import type { ProductType, ProductVariantType } from "@/types";

function activeVariants(variants?: ProductVariantType[]) {
  return (variants || []).filter((variant) => variant.is_active !== false);
}

export function getActiveVariantStock(variants?: ProductVariantType[]) {
  return activeVariants(variants).reduce(
    (total, variant) => total + Number(variant.stock || 0),
    0,
  );
}

export function hasActiveVariants(variants?: ProductVariantType[]) {
  return activeVariants(variants).length > 0;
}

export function getSellableStock(product: ProductType) {
  if (hasActiveVariants(product.variants)) {
    return getActiveVariantStock(product.variants);
  }

  return Number(product.stock || 0);
}

export function isPubliclyVisibleProduct(product: ProductType) {
  const isActive = product.is_active !== false;
  if (!isActive) return false;

  const baseStock = Number(product.stock || 0);
  const variantStock = getActiveVariantStock(product.variants);
  return baseStock > 0 || variantStock > 0;
}

