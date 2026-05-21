import { isProductionDemoDataUnsafe } from "@/utils/demoData";

export function DemoBanner() {
  if (isProductionDemoDataUnsafe) {
    return (
      <div className="w-full border-b border-red-900 bg-red-700 px-4 py-2 text-center text-xs font-black uppercase tracking-[0.18em] text-white">
        Cảnh báo: Production đang bật dữ liệu demo. Hãy tắt NEXT_PUBLIC_USE_DEMO_DATA.
      </div>
    );
  }

  return (
    <div className="w-full border-b border-zinc-900 bg-zinc-950 px-4 py-2 text-center text-xs font-medium uppercase tracking-[0.22em] text-white">
      Miễn phí vận chuyển cho mọi đơn hàng RESEY
    </div>
  );
}
