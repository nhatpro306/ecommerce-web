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
    product.description || "Vietnamese local streetwear by SAIGON LOCAL.";
  const productPath = `/products/${product.slug || product.product_id}`;

  return {
    title: product.title,
    description,
    openGraph: {
      title: `${product.title} | SAIGON LOCAL`,
      description,
      url: productPath,
      images: product.image
        ? [
            {
              url: product.image,
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
