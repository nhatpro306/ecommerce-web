import { Locale, tByLocale } from "@/lib/i18n";

export function getOrderStatusLabel(status: string, locale: Locale) {
  return tByLocale(locale, `status.${status}`, status);
}

export function getProductStatusLabel(status: string, locale: Locale) {
  return tByLocale(locale, `status.${status}`, status);
}

export function getPaymentMethodLabel(method: string, locale: Locale) {
  const key = `checkout.${method}`;
  return tByLocale(locale, key, method);
}
