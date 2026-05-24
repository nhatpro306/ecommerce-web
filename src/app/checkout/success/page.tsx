"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/lib/supabase/client";
import { formatCurrency } from "@/utils/formatCurrency";

interface BankConfig {
  name: string;
  accountName: string;
  accountNumber: string;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useI18n();
  const orderId = searchParams.get("order_id");
  const paymentMethod = searchParams.get("payment_method");
  const total = Number(searchParams.get("total") || 0);
  const [isLoading, setIsLoading] = useState(true);
  const [storeBankConfig, setStoreBankConfig] = useState<BankConfig | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsLoading(false);
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    async function loadStoreSettings() {
      const { data, error } = await supabase
        .from("store_settings")
        .select("bank_name, bank_account_name, bank_account_number")
        .eq("id", 1)
        .maybeSingle();

      if (error || !data) return;

      setStoreBankConfig({
        name: data.bank_name || "Vietcombank",
        accountName: data.bank_account_name || "RESEY",
        accountNumber: data.bank_account_number || "0123456789",
      });
    }

    loadStoreSettings();
  }, []);

  const bankConfig = useMemo(
    () =>
      storeBankConfig || {
        name: process.env.NEXT_PUBLIC_BANK_NAME || "Vietcombank",
        accountName: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || "RESEY",
        accountNumber:
          process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || "0123456789",
      },
    [storeBankConfig],
  );
  const paymentMethodLabel =
    paymentMethod === "bank_transfer"
      ? "Chuyển khoản ngân hàng"
      : "Thanh toán khi nhận hàng (COD)";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white py-12">
        <Card className="mx-auto max-w-md rounded-none">
          <CardHeader>
            <CardTitle>{t("checkout_submitting")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <LoadingSpinner />
            <p className="mt-4 text-zinc-500">
              Vui lòng chờ trong khi hệ thống xác nhận đơn hàng.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-12">
      <Card className="mx-auto max-w-lg rounded-none">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl uppercase">{t("success_title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 text-center">
            <p className="text-zinc-500">{t("success_thanks")}</p>
            {orderId && <p className="text-sm text-zinc-500">Mã đơn hàng: #{orderId}</p>}
            {total > 0 && (
              <p className="text-sm text-zinc-500">
                Tổng thanh toán: {formatCurrency(total)}
              </p>
            )}
            <p className="text-sm text-zinc-500">
              Phương thức thanh toán: {paymentMethodLabel}
            </p>
          </div>

          {paymentMethod === "bank_transfer" && (
            <div className="border border-zinc-200 bg-zinc-50 p-4 text-sm">
              <p className="font-bold uppercase tracking-[0.12em]">
                {t("success_bank_info_title")}
              </p>
              <p className="mt-3">Ngân hàng: {bankConfig.name}</p>
              <p>Chủ tài khoản: {bankConfig.accountName}</p>
              <p>Số tài khoản: {bankConfig.accountNumber}</p>
              <p className="mt-3 font-bold">Nội dung: ORDER-{orderId}</p>
            </div>
          )}

          <div className="border border-zinc-200 p-4 text-sm text-zinc-600">
            {t("success_contact_note")}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              onClick={() => router.push("/profile")}
              variant="outline"
              className="cursor-pointer rounded-none"
            >
              {t("success_view_order")}
            </Button>
            <Button
              onClick={() => router.push("/")}
              className="cursor-pointer rounded-none bg-zinc-950 text-white hover:bg-zinc-800"
            >
              {t("success_continue")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingFallback() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-white py-12">
      <Card className="mx-auto max-w-md rounded-none">
        <CardHeader>
          <CardTitle>{t("loading")}</CardTitle>
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
