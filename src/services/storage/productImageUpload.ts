import { supabase } from "@/lib/supabase/client";

const PRODUCT_IMAGE_BUCKET = "product-images";
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type UploadedProductImage = {
  url: string;
  path: string;
};

type SupabaseLikeError = {
  code?: string;
  message?: string;
  name?: string;
  statusCode?: string | number;
  error?: string;
  details?: string;
  hint?: string;
};

function getImageExtension(file: File): string {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function getSupabaseErrorMessage(
  operation: string,
  error: SupabaseLikeError,
  context?: string,
) {
  return [
    operation,
    context,
    error.code ? `code ${error.code}` : null,
    error.statusCode ? `status ${error.statusCode}` : null,
    error.name,
    error.error,
    error.details,
    error.hint,
    error.message,
  ]
    .filter(Boolean)
    .join(" - ");
}

function logSupabaseError(
  operation: string,
  error: SupabaseLikeError,
  context?: Record<string, unknown>,
) {
  console.error("[productImageUpload]", {
    operation,
    code: error.code,
    statusCode: error.statusCode,
    name: error.name,
    error: error.error,
    message: error.message,
    details: error.details,
    hint: error.hint,
    ...context,
  });
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
    logSupabaseError("storage_upload_failed", uploadError, {
      productId,
      bucket: PRODUCT_IMAGE_BUCKET,
      path,
    });

    throw new Error(
      getSupabaseErrorMessage(
        "Không thể upload ảnh lên Supabase Storage",
        uploadError,
        `bucket=${PRODUCT_IMAGE_BUCKET}, path=${path}`,
      ),
    );
  }

  const { data } = supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .getPublicUrl(path);

  if (!data.publicUrl) {
    throw new Error("Không thể lấy URL công khai của ảnh sau khi upload.");
  }

  return {
    path,
    url: data.publicUrl,
  };
}

async function rollbackUploadedImages(images: UploadedProductImage[]) {
  if (images.length === 0) return;

  const paths = images.map((image) => image.path);

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .remove(paths);

  if (error) {
    logSupabaseError("rollback_uploaded_images_failed", error, {
      bucket: PRODUCT_IMAGE_BUCKET,
      paths,
    });
  }
}

export async function uploadAndAttachProductImages(
  productId: string,
  files: File[],
  primaryIndex = 0,
  onProgress?: (progressPercent: number) => void,
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

  const safePrimaryIndex =
    primaryIndex >= 0 && primaryIndex < files.length ? primaryIndex : 0;

  const uploadedImages: UploadedProductImage[] = [];

  try {
    onProgress?.(5);

    for (const [index, file] of files.entries()) {
      const uploaded = await uploadProductImage(productId, file);
      uploadedImages.push(uploaded);
      onProgress?.(Math.min(55, Math.round(((index + 1) / files.length) * 55)));
    }

    const imagePayload = uploadedImages.map((uploaded, index) => ({
      url: uploaded.url,
      alt_text: files[index]?.name || null,
      sort_order: index,
      is_primary: index === safePrimaryIndex,
    }));

    const { error: syncError } = await supabase.rpc("sync_product_images", {
      p_product_id: productId,
      p_images: imagePayload,
    });

    if (syncError) {
      logSupabaseError("sync_product_images_failed", syncError, {
        productId,
        uploadedCount: uploadedImages.length,
      });

      throw new Error(
        getSupabaseErrorMessage(
          "Ảnh đã upload nhưng không thể đồng bộ metadata ảnh. Vui lòng kiểm tra migration sync_product_images và quyền admin",
          syncError,
          `product_id=${productId}`,
        ),
      );
    }

    onProgress?.(95);

    onProgress?.(100);

    return uploadedImages;
  } catch (error) {
    console.error("[productImageUpload] upload_and_attach_failed", {
      operation: "upload_and_attach_product_images",
      productId,
      uploadedCount: uploadedImages.length,
      error,
    });

    await rollbackUploadedImages(uploadedImages);

    throw error;
  }
}
