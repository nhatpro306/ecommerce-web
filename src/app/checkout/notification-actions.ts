"use server";

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
  const sellerEmail = process.env.SELLER_NOTIFICATION_EMAIL;
  const paymentLabel =
    input.paymentMethod === "bank_transfer" ? "Chuyển khoản" : "COD";

  const sellerHtml = `
    <h1>RESEY có đơn hàng mới #${input.orderId}</h1>
    <p>Khách hàng: ${input.customerName}</p>
    <p>Tổng tiền: ${formatVnd(input.total)}</p>
    <p>Thanh toán: ${paymentLabel}</p>
  `;

  const customerHtml = `
    <h1>RESEY xác nhận đơn hàng #${input.orderId}</h1>
    <p>Cảm ơn ${input.customerName} đã đặt hàng tại RESEY.</p>
    <p>Tổng tiền: ${formatVnd(input.total)}</p>
    <p>Phương thức thanh toán: ${paymentLabel}</p>
  `;

  const jobs: Promise<unknown>[] = [];

  if (sellerEmail) {
    jobs.push(
      sendResendEmail(
        sellerEmail,
        `RESEY - Đơn hàng mới #${input.orderId}`,
        sellerHtml,
      ),
    );
  }

  if (input.customerEmail) {
    jobs.push(
      sendResendEmail(
        input.customerEmail,
        `RESEY - Xác nhận đơn hàng #${input.orderId}`,
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
