import { Button } from "@/components/ui/button";

interface EmptyOrdersStateProps {
  onBrowseProducts: () => void;
}

export function EmptyOrdersState({ onBrowseProducts }: EmptyOrdersStateProps) {
  return (
    <div className="bg-muted/20 rounded-lg border p-8 text-center">
      <p className="text-muted-foreground">
        Bạn chưa có đơn hàng nào.
      </p>
      <Button className="mt-4 cursor-pointer" onClick={onBrowseProducts}>
        Xem sản phẩm
      </Button>
    </div>
  );
}
