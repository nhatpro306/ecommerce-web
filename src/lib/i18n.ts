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
  admin_no_permission: {
    vi: "Bạn không có quyền truy cập",
    en: "You do not have permission",
  },
  admin_go_profile: { vi: "Về trang tài khoản", en: "Go to profile" },

  loading: { vi: "Đang tải...", en: "Loading..." },
  no_data: { vi: "Không có dữ liệu", en: "No data" },
  generic_error: { vi: "Có lỗi xảy ra", en: "Something went wrong" },
  products_load_error: {
    vi: "Không thể tải sản phẩm",
    en: "Could not load products",
  },
  product_update_error: {
    vi: "Không thể cập nhật sản phẩm",
    en: "Could not update product",
  },
  product_update_success: {
    vi: "Sản phẩm đã được cập nhật",
    en: "Product updated successfully",
  },

  admin_products_title: { vi: "Quản lý sản phẩm", en: "Product Management" },
  admin_add_product: { vi: "Thêm sản phẩm", en: "Add Product" },
  admin_edit_product: { vi: "Sửa sản phẩm", en: "Edit Product" },
  admin_delete_product: { vi: "Xóa sản phẩm", en: "Delete Product" },
  admin_hide_product: { vi: "Ẩn sản phẩm", en: "Hide Product" },
  admin_view_product: { vi: "Xem", en: "View" },

  admin_orders_title: { vi: "Quản lý đơn hàng", en: "Order Management" },
  admin_orders: { vi: "Đơn hàng", en: "Orders" },
  admin_cancel_order: { vi: "Hủy đơn hàng", en: "Cancel Order" },
  admin_delete_order: { vi: "Xóa đơn hàng", en: "Delete Order" },
  admin_order_status_pending: { vi: "Chờ xác nhận", en: "Pending" },
  admin_order_status_processing: { vi: "Đang đóng gói", en: "Processing" },
  admin_order_status_shipped: { vi: "Đang giao", en: "Shipping" },
  admin_order_status_delivered: { vi: "Hoàn thành", en: "Completed" },
  admin_order_status_cancelled: { vi: "Đã hủy", en: "Cancelled" },

  action_save: { vi: "Lưu", en: "Save" },
  action_cancel: { vi: "Hủy", en: "Cancel" },
  action_delete: { vi: "Xóa", en: "Delete" },
  action_edit: { vi: "Sửa", en: "Edit" },
  action_search: { vi: "Tìm kiếm", en: "Search" },
  action_close: { vi: "Đóng", en: "Close" },
  action_confirm: { vi: "Xác nhận", en: "Confirm" },

  field_status: { vi: "Trạng thái", en: "Status" },
  field_price: { vi: "Giá", en: "Price" },
  field_stock: { vi: "Tồn kho", en: "Stock" },
  field_category: { vi: "Danh mục", en: "Category" },
  field_name: { vi: "Tên", en: "Name" },
  field_image: { vi: "Ảnh", en: "Image" },
  field_size: { vi: "Kích cỡ", en: "Size" },
  field_color: { vi: "Màu sắc", en: "Color" },

  status_active: { vi: "Đang bán", en: "Active" },
  status_hidden: { vi: "Đang ẩn", en: "Hidden" },
  status_out_of_stock: { vi: "Hết hàng", en: "Out of stock" },
  status_low_stock: { vi: "Sắp hết hàng", en: "Low stock" },
  status_missing_image: { vi: "Thiếu ảnh", en: "Missing image" },
  status_not_visible: { vi: "Không hiện ngoài web", en: "Not visible on shop" },

  home_new_arrivals: { vi: "Hàng mới về", en: "New Arrivals" },
  home_featured: { vi: "Sản phẩm nổi bật", en: "Featured Products" },
  home_view_all: { vi: "Xem tất cả", en: "View all" },
  home_empty_featured: {
    vi: "Hiện chưa có sản phẩm nổi bật.",
    en: "No featured products yet.",
  },
  home_story_label: { vi: "Câu chuyện thương hiệu", en: "Brand Story" },

  products_title: { vi: "Tất cả sản phẩm", en: "All Products" },
  products_in_stock: { vi: "Còn hàng", en: "In stock" },
  products_out_of_stock: { vi: "Hết hàng", en: "Out of stock" },
  products_empty: {
    vi: "Không tìm thấy sản phẩm phù hợp.",
    en: "No matching products found.",
  },

  product_add_to_cart: { vi: "Thêm vào giỏ", en: "Add to Cart" },
  product_out_of_stock: { vi: "Hết hàng", en: "Out of Stock" },
  product_size_label: { vi: "Kích cỡ", en: "Size" },
  product_color_label: { vi: "Màu sắc", en: "Color" },
  product_quantity_label: { vi: "Số lượng", en: "Quantity" },
  product_choose_size: { vi: "Chọn size", en: "Select size" },
  product_choose_color: { vi: "Chọn màu", en: "Select color" },
  product_related_title: { vi: "Có thể bạn thích", en: "You may also like" },

  cart_title: { vi: "Giỏ hàng của bạn", en: "Your Cart" },
  cart_empty_title: { vi: "Giỏ hàng trống", en: "Your cart is empty" },
  cart_empty_sub: {
    vi: "Chọn sản phẩm RESEY để bắt đầu đơn hàng.",
    en: "Add RESEY products to get started.",
  },
  cart_continue_shopping: { vi: "Tiếp tục mua sắm", en: "Continue Shopping" },
  cart_view_products: { vi: "Xem sản phẩm", en: "Browse Products" },
  cart_checkout_button: { vi: "Thanh toán", en: "Checkout" },
  cart_subtotal: { vi: "Tạm tính", en: "Subtotal" },
  cart_guest_notice: {
    vi: "Bạn có thể xem giỏ hàng trước. Khi thanh toán, hệ thống sẽ yêu cầu đăng nhập.",
    en: "You can review your cart first. Login will be required at checkout.",
  },

  checkout_section_label: { vi: "Thanh toán", en: "Checkout" },
  checkout_title: { vi: "Thông tin giao hàng", en: "Shipping Information" },
  checkout_payment_label: { vi: "Phương thức thanh toán", en: "Payment Method" },
  checkout_order_summary: { vi: "Đơn hàng của bạn", en: "Your Order" },
  checkout_total: { vi: "Tổng", en: "Total" },
  checkout_submit: { vi: "Đặt hàng", en: "Place Order" },
  checkout_submitting: { vi: "Đang xử lý...", en: "Processing..." },

  success_title: { vi: "Đặt hàng thành công", en: "Order Placed" },
  success_thanks: {
    vi: "Cảm ơn bạn đã mua sắm tại RESEY.",
    en: "Thank you for shopping at RESEY.",
  },
  success_bank_info_title: {
    vi: "Thông tin chuyển khoản",
    en: "Bank Transfer Details",
  },
  success_view_order: { vi: "Xem đơn hàng", en: "View Order" },
  success_continue: { vi: "Tiếp tục mua sắm", en: "Continue Shopping" },
  success_contact_note: {
    vi: "RESEY đã nhận thông tin đặt hàng. Shop sẽ liên hệ với bạn qua số điện thoại đã cung cấp để xác nhận đơn trước khi giao.",
    en: "RESEY has received your order. The shop will contact you via phone to confirm before shipping.",
  },
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
