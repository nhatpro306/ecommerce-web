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

function getSupabaseErrorMessage(
  operation: string,
  error: {
    message?: string;
    name?: string;
    statusCode?: string | number;
    error?: string;
  },
  context?: string,
) {
  return [
    operation,
    context,
    error.statusCode ? `status ${error.statusCode}` : null,
    error.name,
    error.error,
    error.message,
  ]
    .filter(Boolean)
    .join(" - ");
}

export function validateProductImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.";
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return "Ảnh sản phẩm phải nhỏ hơn hoặc bằng 5MB.";
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
    throw new Error(
      getSupabaseErrorMessage(
        "Không thể upload ảnh lên Supabase Storage",
        uploadError,
        `bucket=${PRODUCT_IMAGE_BUCKET}, path=${path}`,
      ),
    );
  }

  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);

  return { path, url: data.publicUrl };
}

export async function uploadAndAttachProductImages(
  productId: string,
  files: File[],
  primaryIndex = 0,
): Promise<UploadedProductImage[]> {
  if (!productId?.trim()) {
    throw new Error("Thiếu mã sản phẩm. Không thể tải ảnh.");
  }

  if (!Array.isArray(files) || files.length === 0) {
    return [];
  }

  const invalidFileError = files
    .map((file) => validateProductImageFile(file))
    .find((message): message is string => Boolean(message));
  if (invalidFileError) {
    throw new Error(invalidFileError);
  }

  const uploadedImages: UploadedProductImage[] = [];

  for (const file of files) {
    const uploaded = await uploadProductImage(productId, file);
    uploadedImages.push(uploaded);
  }

  const { error: resetPrimaryError } = await supabase
    .from("product_images")
    .update({ is_primary: false })
    .eq("product_id", productId);

  if (resetPrimaryError) {
    throw new Error(
      getSupabaseErrorMessage(
        "Không thể bỏ đánh dấu ảnh chính cũ trong bảng product_images",
        resetPrimaryError,
        `product_id=${productId}`,
      ),
    );
  }

  for (const [index, file] of files.entries()) {
    const uploaded = uploadedImages[index];
    const { data: existingRows, error: lookupError } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", productId)
      .eq("url", uploaded.url)
      .limit(1);

    if (lookupError) {
      console.error("Product image metadata lookup failed", {
        productId,
        path: uploaded.path,
        error: lookupError,
      });
      throw new Error(
        "Không thể lưu ảnh sản phẩm. Vui lòng thử lại hoặc kiểm tra cấu hình Supabase.",
      );
    }

    if (existingRows && existingRows.length > 0) {
      continue;
    }

    const { error: imageError } = await supabase.from("product_images").insert({
      product_id: productId,
      url: uploaded.url,
      alt_text: file.name,
      sort_order: index,
      is_primary: index === primaryIndex,
    });

    if (imageError) {
      throw new Error(
        getSupabaseErrorMessage(
          "Không thể lưu URL ảnh vào bảng product_images",
          imageError,
          `product_id=${productId}, url=${uploaded.url}`,
        ),
      );
    }

  const primaryUploadedImage =
    uploadedImages[primaryIndex] || uploadedImages[0] || null;

  if (primaryUploadedImage) {
    const { error: productError } = await supabase
      .from("products")
      .update({ image: primaryUploadedImage.url })
      .eq("product_id", productId);

    if (productError) {
      throw new Error(
        getSupabaseErrorMessage(
          "Không thể cập nhật ảnh chính trong bảng products",
          productError,
          `product_id=${productId}`,
        ),
      );
    }
  }

  return uploadedImages;
}
