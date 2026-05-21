import { supabase } from "@/lib/supabase/client";

const PRODUCT_IMAGE_BUCKET = "product-images";
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type UploadedProductImage = {
  url: string;
  path: string;
};

function getImageExtension(file: File): string {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export function validateProductImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Only JPEG, PNG, and WebP images are allowed.";
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "Product image must be 5MB or smaller.";
  }

  return null;
}

export async function uploadProductImage(
  productId: string,
  file: File,
): Promise<UploadedProductImage> {
  const validationError = validateProductImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const extension = getImageExtension(file);
  const path = `${productId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);

  return { path, url: data.publicUrl };
}

export async function uploadAndAttachProductImages(
  productId: string,
  files: File[],
  primaryIndex = 0,
): Promise<UploadedProductImage[]> {
  const uploadedImages: UploadedProductImage[] = [];

  for (const [index, file] of files.entries()) {
    const uploaded = await uploadProductImage(productId, file);
    uploadedImages.push(uploaded);

    const { error: imageError } = await supabase.from("product_images").insert({
      product_id: productId,
      url: uploaded.url,
      alt_text: file.name,
      sort_order: index,
      is_primary: index === primaryIndex,
    });

    if (imageError) {
      throw new Error(imageError.message);
    }
  }

  if (uploadedImages[primaryIndex]) {
    const { error: productError } = await supabase
      .from("products")
      .update({ image: uploadedImages[primaryIndex].url })
      .eq("product_id", productId);

    if (productError) {
      throw new Error(productError.message);
    }
  }

  return uploadedImages;
}
