"use client";

import { useEffect, useMemo, useState } from "react";

export type Language = "vi" | "en";
type Dictionary = Record<string, { vi: string; en: string }>;

const STORAGE_KEY = "resey_lang";
const EVENT_NAME = "resey:lang-change";

const dictionary: Dictionary = {
  nav_home: { vi: "Trang chủ", en: "Home" },
  nav_products: { vi: "Sản phẩm", en: "Products" },
  nav_collection: { vi: "Bộ sưu tập", en: "Collection" },
  nav_about: { vi: "Về RESEY", en: "About RESEY" },
  nav_contact: { vi: "Liên hệ", en: "Contact" },
  nav_search: { vi: "Tìm sản phẩm", en: "Search products" },
  nav_cart: { vi: "Giỏ hàng", en: "Cart" },
  nav_account: { vi: "Tài khoản", en: "Account" },
  nav_signin: { vi: "Đăng nhập", en: "Sign in" },
  admin_role: { vi: "Admin", en: "Admin" },
  admin_profile: { vi: "Hồ sơ tài khoản", en: "Profile" },
  admin_store_settings: { vi: "Cài đặt cửa hàng", en: "Store settings" },
  admin_back_storefront: { vi: "Về trang chủ", en: "Back to storefront" },
  admin_signout: { vi: "Đăng xuất", en: "Sign out" },
  admin_no_permission: { vi: "Bạn không có quyền truy cập", en: "You do not have permission" },
  admin_go_profile: { vi: "Về trang tài khoản", en: "Go to profile" },
  loading: { vi: "Đang tải...", en: "Loading..." },
  no_data: { vi: "Không có dữ liệu", en: "No data" },
  generic_error: { vi: "Có lỗi xảy ra", en: "Something went wrong" },
  products_load_error: { vi: "Không thể tải sản phẩm", en: "Could not load products" },
  product_update_error: { vi: "Không thể cập nhật sản phẩm", en: "Could not update product" },
  product_update_success: { vi: "Sản phẩm đã được cập nhật", en: "Product updated successfully" },
};

function readLanguage(): Language {
  if (typeof window === "undefined") return "vi";
  const current = window.localStorage.getItem(STORAGE_KEY);
  return current === "en" ? "en" : "vi";
}

export function setLanguage(language: Language) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, language);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: language }));
}

export function translate(key: string, language: Language) {
  const entry = dictionary[key];
  if (!entry) return key;
  return entry[language] || entry.vi;
}

export function useI18n() {
  const [language, setLanguageState] = useState<Language>("vi");

  useEffect(() => {
    const apply = () => setLanguageState(readLanguage());
    apply();

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) apply();
    };
    const onCustom = () => apply();

    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT_NAME, onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENT_NAME, onCustom as EventListener);
    };
  }, []);

  return useMemo(
    () => ({
      language,
      t: (key: string) => translate(key, language),
      setLanguage,
    }),
    [language],
  );
}

