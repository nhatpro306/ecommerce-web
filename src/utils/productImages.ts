import { ProductType } from "@/types";

export function getProductImage(product: ProductType): string {
  const primaryImage = product.images?.find((image) => image.is_primary);
  return (
    primaryImage?.url ||
    product.images?.[0]?.url ||
    product.image ||
    "/images/product-placeholder.jpg"
  );
}
