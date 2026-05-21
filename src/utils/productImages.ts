import { ProductType } from "@/types";

const skuImages: Record<string, string> = {
  "RS-TEE-101": "/images/products/brown-tee-fallback.jpg",
  "RS-TEE-102": "/images/products/black-tee-fallback.jpg",
  "RS-TEE-103": "/images/products/olive-tee-fallback.jpg",
  "RS-SET-104": "/images/brand-story.jpg",
  "RS-PAN-105": "/products/resey-washed-tee-brown-fit-05.jpg",
  "RS-PAN-106": "/images/hero-resey.jpg",
  "SL-TEE-001": "/images/products/black-tee-fallback.jpg",
  "SL-HOO-002": "/images/products/olive-tee-fallback.jpg",
  "SL-PAN-003": "/images/hero-resey.jpg",
  "SL-ACC-004": "/images/brand-story.jpg",
  "SL-TEE-005": "/images/products/brown-tee-fallback.jpg",
  "SL-TEE-006": "/images/products/black-tee-fallback.jpg",
  "SL-TEE-007": "/images/brand-story.jpg",
  "SL-HOO-008": "/images/products/olive-tee-fallback.jpg",
};

const categoryImages: Record<string, string> = {
  "T-Shirts": "/images/products/black-tee-fallback.jpg",
  Hoodies: "/images/products/olive-tee-fallback.jpg",
  Pants: "/images/hero-resey.jpg",
  Accessories: "/images/brand-story.jpg",
};

export function getProductImage(product: ProductType): string {
  const primaryImage = product.images?.find((image) => image.is_primary);

  return (
    primaryImage?.url ||
    product.images?.[0]?.url ||
    product.image ||
    (product.sku ? skuImages[product.sku] : undefined) ||
    (product.category?.name ? categoryImages[product.category.name] : undefined) ||
    categoryImages["T-Shirts"]
  );
}
