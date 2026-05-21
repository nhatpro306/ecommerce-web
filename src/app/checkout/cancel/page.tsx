"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export default function CancelPage() {
  const router = useRouter();

  return (
    <div className="bg-background min-h-screen py-12">
      <Card className="mx-auto max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Thanh toán đã hủy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 text-center">
            <p className="text-muted-foreground">
              Quy trình thanh toán đã được hủy. Đơn hàng chưa được tạo.
            </p>
            <p className="text-muted-foreground">
              Sản phẩm vẫn còn trong giỏ hàng. Bạn có thể quay lại thanh toán khi sẵn sàng.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              onClick={() => router.push("/cart")}
              variant="outline"
              className="cursor-pointer"
            >
              Quay lại giỏ hàng
            </Button>
            <Button
              onClick={() => router.push("/checkout")}
              className="cursor-pointer"
            >
              Thanh toán lại
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
