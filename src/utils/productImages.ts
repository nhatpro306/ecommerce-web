import { ProductType } from "@/types";

const skuImages: Record<string, string> = {
  "RS-TEE-101": "/products/resey-washed-tee-brown-fit-02.jpg",
  "RS-TEE-102": "/products/resey-washed-tee-brown-fit-03.jpg",
  "RS-TEE-103": "/products/resey-washed-tee-olive-fit-01.jpg",
  "RS-SET-104": "/products/resey-washed-tee-brown-fit-01.jpg",
  "RS-PAN-105": "/products/resey-washed-tee-brown-fit-05.jpg",
  "RS-PAN-106": "/products/resey-washed-tee-brown-fit-04.jpg",
  "SL-TEE-001": "/products/resey-washed-tee-brown-fit-02.jpg",
  "SL-HOO-002":
    "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80",
  "SL-PAN-003": "/products/resey-washed-tee-brown-fit-04.jpg",
  "SL-ACC-004":
    "https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=900&q=80",
  "SL-TEE-005": "/products/resey-washed-tee-brown-fit-03.jpg",
  "SL-TEE-006":
    "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=80",
  "SL-TEE-007": "/products/resey-washed-tee-brown-fit-01.jpg",
  "SL-HOO-008":
    "https://images.unsplash.com/photo-1578681994506-b8f463449011?auto=format&fit=crop&w=900&q=80",
};

const categoryImages: Record<string, string> = {
  "T-Shirts": "/products/resey-washed-tee-brown-fit-02.jpg",
  Hoodies:
    "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80",
  Pants: "/products/resey-washed-tee-brown-fit-04.jpg",
  Accessories:
    "https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=900&q=80",
};

export function getProductImage(product: ProductType): string {
  return (
    product.image ||
    (product.sku ? skuImages[product.sku] : undefined) ||
    (product.category?.name ? categoryImages[product.category.name] : undefined) ||
    categoryImages["T-Shirts"]
  );
}
