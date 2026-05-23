import type { Metadata } from "next";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CheckoutClient from "@/app/checkout/CheckoutClient";

export const metadata: Metadata = {
  title: "Thanh toán",
  description: "Hoàn tất đơn hàng RESEY với COD hoặc chuyển khoản.",
};

export default async function CheckoutPage() {
  // Get authenticated user (server-side)
  const user = await getAuthenticatedUser();

  // Redirect to sign-in if not authenticated
  if (!user) {
    redirect("/signin");
  }

  return <CheckoutClient />;
}
