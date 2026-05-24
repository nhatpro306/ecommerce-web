import Link from "next/link";
import { Home, Search } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
          <Search className="h-8 w-8 text-zinc-400" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900">Không tìm thấy trang</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Trang bạn tìm không tồn tại hoặc đã được di chuyển.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-none bg-zinc-950 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-white hover:bg-zinc-800"
          >
            <Home className="mr-2 h-4 w-4" />
            Về trang chủ
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-none border border-zinc-200 px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-zinc-700 hover:bg-zinc-50"
          >
            Xem sản phẩm
          </Link>
        </div>
        <p className="mt-4 text-xs text-zinc-400">
          Hoặc dùng thanh tìm kiếm phía trên để tìm sản phẩm bạn cần.
        </p>
      </div>
    </div>
  );
}
