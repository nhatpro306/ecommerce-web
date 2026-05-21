import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProductDetailsClient from "./ProductDetailsClient";
import { productServerService } from "@/services/product/productServerService";

interface ProductDetailsPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: ProductDetailsPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const product = await productServerService.getProductBySlug(
    resolvedParams.slug,
  );

  if (!product) {
    return {
      title: "Không tìm thấy sản phẩm",
    };
  }

  const description =
    product.description || "Streetwear Việt Nam bởi RESEY.";
  const productPath = `/products/${product.slug || product.product_id}`;
  const productImage = product.images?.find((image) => image.is_primary)?.url || product.image;

  return {
    title: product.title,
    description,
    openGraph: {
      title: `${product.title} | RESEY`,
      description,
      url: productPath,
      images: productImage
        ? [
            {
              url: productImage,
              alt: product.title,
            },
          ]
        : undefined,
    },
  };
}

export default async function ProductDetailsPage({
  params,
}: ProductDetailsPageProps) {
  const resolvedParams = await params;
  const product = await productServerService.getProductBySlug(
    resolvedParams.slug,
  );

  if (!product) {
    notFound();
  }

  return <ProductDetailsClient product={product} />;
}
