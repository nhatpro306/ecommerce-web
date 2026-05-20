"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { CheckCircle2 } from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("order_id");
  const paymentMethod = searchParams.get("payment_method");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen py-12">
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle>?ang x? ly ??n hang...</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <LoadingSpinner />
            <p className="text-muted-foreground mt-4">
              Vui long ch? trong khi h? th?ng xac nh?n va t?o ??n hang.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen py-12">
      <Card className="mx-auto max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">??t hang thanh cong!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 text-center">
            <p className="text-muted-foreground">
              C?m ?n b?n ?a mua s?m t?i SAIGON LOCAL.
            </p>
            {orderId && (
              <p className="text-muted-foreground text-sm">Ma ??n hang: #{orderId}</p>
            )}
            {paymentMethod === "bank_transfer" && (
              <p className="text-muted-foreground text-sm">
                N?i dung chuy?n kho?n: ORDER-{orderId}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              onClick={() => router.push("/profile")}
              variant="outline"
              className="cursor-pointer"
            >
              Xem ??n hang
            </Button>
            <Button onClick={() => router.push("/")} className="cursor-pointer">
              Ti?p t?c mua s?m
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="bg-background min-h-screen py-12">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>?ang t?i...</CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSpinner />
        </CardContent>
      </Card>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SuccessContent />
    </Suspense>
  );
}
