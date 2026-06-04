"use server";

import { createServerSupabase } from "@/lib/supabase/server";

interface OrderNotificationInput {
  orderId: number;
  customerName: string;
  customerEmail?: string;
  total: number;
  paymentMethod: "cod" | "bank_transfer";
}

const formatVnd = (value: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function sendResendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    return { skipped: true };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend failed: ${body}`);
  }

  return { skipped: false };
}

export async function sendOrderCreatedNotificationAction(
  input: OrderNotificationInput,
) {
  if (!Number.isInteger(input.orderId) || input.orderId <= 0) {
    return { skipped: true };
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { skipped: true };
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select("id, customer_name, customer_email, total, payment_method")
    .eq("id", input.orderId)
    .eq("user_id", user.id)
    .single();

  if (error || !order) {
    return { skipped: true };
  }

  const sellerEmail = process.env.SELLER_NOTIFICATION_EMAIL;
  const orderId = order.id;
  const customerName = escapeHtml(order.customer_name || input.customerName || "Khách hàng");
  const customerEmail = order.customer_email || input.customerEmail;
  const total = Number(order.total || input.total || 0);
  const paymentLabel =
    order.payment_method === "bank_transfer" || input.paymentMethod === "bank_transfer"
      ? "Chuyển khoản"
      : "COD";

  const sellerHtml = `
    <h1>RESEY có đơn hàng mới #${orderId}</h1>
    <p>Khách hàng: ${customerName}</p>
    <p>Tổng tiền: ${formatVnd(total)}</p>
    <p>Thanh toán: ${paymentLabel}</p>
  `;

  const customerHtml = `
    <h1>RESEY xác nhận đơn hàng #${orderId}</h1>
    <p>Cảm ơn ${customerName} đã đặt hàng tại RESEY.</p>
    <p>Tổng tiền: ${formatVnd(total)}</p>
    <p>Phương thức thanh toán: ${paymentLabel}</p>
  `;

  const jobs: Promise<unknown>[] = [];

  if (sellerEmail) {
    jobs.push(
      sendResendEmail(
        sellerEmail,
        `RESEY - Đơn hàng mới #${orderId}`,
        sellerHtml,
      ),
    );
  }

  if (customerEmail && isValidEmail(customerEmail)) {
    jobs.push(
      sendResendEmail(
        customerEmail,
        `RESEY - Xác nhận đơn hàng #${orderId}`,
        customerHtml,
      ),
    );
  }

  if (jobs.length === 0) {
    return { skipped: true };
  }

  await Promise.all(jobs);
  return { skipped: false };
}
