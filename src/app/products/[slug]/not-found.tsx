import Link from "next/link";

export default function ProductNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="mb-4 text-2xl font-bold text-gray-800 dark:text-gray-100">
        Không tìm thấy sản phẩm
      </h1>
      <p className="mb-6 text-gray-600 dark:text-gray-300">
        Sản phẩm bạn đang tìm có thể đã bị ẩn hoặc không còn tồn tại.
      </p>
      <Link
        href="/products"
        className="bg-primary hover:bg-primary/90 rounded-md px-4 py-2 text-white"
      >
        Xem sản phẩm
      </Link>
    </div>
  );
}
