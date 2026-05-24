"use client";

import { useEffect, useMemo, useState } from "react";

export type Locale = "vi" | "en";
export type Language = Locale;

const STORAGE_KEY = "resey_lang";
const EVENT_NAME = "resey:lang-change";

type FlatDictionary = Record<string, string>;
type I18nDictionary = Record<Locale, FlatDictionary>;

const dictionary: I18nDictionary = {
  vi: {
    "common.loading": "Đang tải...",
    "common.processing": "Đang xử lý...",
    "common.save": "Lưu",
    "common.cancel": "Hủy",
    "common.delete": "Xóa",
    "common.close": "Đóng",
    "common.search": "Tìm kiếm",
    "common.retry": "Thử lại",
    "common.noData": "Không có dữ liệu",
    "common.required": "Vui lòng nhập thông tin này.",
    "common.errorGeneric": "Có lỗi xảy ra. Vui lòng thử lại.",

    "nav.home": "Trang chủ",
    "nav.products": "Sản phẩm",
    "nav.collections": "Bộ sưu tập",
    "nav.about": "Về RESEY",
    "nav.contact": "Liên hệ",
    "nav.search": "Tìm sản phẩm",
    "nav.cart": "Giỏ hàng",
    "nav.account": "Tài khoản",
    "nav.signIn": "Đăng nhập",
    "nav.signOut": "Đăng xuất",

    "admin.role": "Quản trị viên",
    "admin.profile": "Hồ sơ",
    "admin.storeSettings": "Cài đặt cửa hàng",
    "admin.backStorefront": "Xem cửa hàng",
    "admin.noPermission": "Bạn không có quyền truy cập trang này.",
    "admin.goProfile": "Về trang hồ sơ",
    "admin.overview": "Tổng quan",
    "admin.products": "Sản phẩm",
    "admin.orders": "Đơn hàng",
    "admin.users": "Khách hàng",
    "admin.settings": "Cài đặt",
    "admin.panel": "Bảng quản trị",
    "admin.title": "RESEY Admin",

    "products.inStock": "Còn hàng",
    "products.outOfStock": "Hết hàng",
    "products.related": "Có thể bạn sẽ thích",
    "products.material": "Chất liệu",
    "products.stock": "Tồn kho",
    "products.selectColor": "Chọn màu sắc",
    "products.selectSize": "Chọn kích thước",
    "products.quantity": "Số lượng",
    "products.description": "Mô tả sản phẩm",
    "products.sizeGuide": "Bảng size",
    "products.sizeSelectHint": "Vui lòng chọn màu trước khi chọn size.",
    "products.sizeSelectHintWithColor":
      "Vui lòng chọn kích thước phù hợp trước khi đặt hàng.",
    "products.sizeSelectHintNoColor": "Chọn màu sắc trước để xem size còn hàng.",
    "products.addedToCart": "Đã thêm vào giỏ",
    "products.addToCart": "Thêm vào giỏ",
    "products.fastShipping": "Giao nhanh",
    "products.fastShippingDesc": "Nội thành 1-2 ngày",
    "products.payment": "Thanh toán",
    "products.paymentDesc": "COD / chuyển khoản",
    "products.returnPolicy": "Đổi trả",
    "products.returnPolicyDesc": "Trong vòng 7 ngày",
    "products.stockFewLeft": "Chỉ còn {count} sản phẩm",
    "products.chooseSizeError": "Vui lòng chọn kích thước.",
    "products.chooseColorError": "Vui lòng chọn màu sắc.",
    "products.variantUnavailable": "Biến thể size/màu hiện không khả dụng.",
    "products.outOfStockError": "Sản phẩm đã hết hàng.",
    "products.quantityExceedsStock": "Số lượng vượt quá tồn kho hiện tại.",

    "cart.title": "Giỏ hàng của bạn",
    "cart.continueShopping": "Tiếp tục mua sắm",
    "cart.emptyTitle": "Giỏ hàng trống",
    "cart.emptySub": "Thêm sản phẩm RESEY để bắt đầu đơn hàng.",
    "cart.viewProducts": "Xem sản phẩm",
    "cart.checkoutButton": "Tiến hành thanh toán",
    "cart.subtotal": "Tạm tính",
    "cart.shippingFee": "Phí vận chuyển",
    "cart.freeShipping": "Miễn phí",
    "cart.guestNotice":
      "Bạn có thể xem giỏ hàng trước. Hệ thống sẽ yêu cầu đăng nhập khi thanh toán.",

    "checkout.sectionLabel": "Thanh toán",
    "checkout.title": "Thông tin giao hàng",
    "checkout.fullName": "Họ và tên *",
    "checkout.phone": "Số điện thoại *",
    "checkout.emailOptional": "Email (không bắt buộc)",
    "checkout.addressDetail": "Địa chỉ chi tiết (số nhà, tên đường) *",
    "checkout.ward": "Phường/Xã *",
    "checkout.district": "Quận/Huyện *",
    "checkout.province": "Tỉnh/Thành phố *",
    "checkout.note": "Ghi chú đơn hàng",
    "checkout.phoneInvalid": "Số điện thoại phải bắt đầu bằng 0 và có đúng 10 chữ số.",
    "checkout.paymentMethod": "Phương thức thanh toán",
    "checkout.cod": "COD",
    "checkout.codDesc": "Thanh toán khi nhận hàng",
    "checkout.bankTransfer": "Chuyển khoản",
    "checkout.bankTransferDesc": "Chuyển khoản ngân hàng",
    "checkout.bankName": "Ngân hàng",
    "checkout.bankAccountName": "Chủ tài khoản",
    "checkout.bankAccountNumber": "Số tài khoản",
    "checkout.bankNote":
      "Nội dung chuyển khoản sẽ hiển thị sau khi tạo đơn: ORDER-{id}",
    "checkout.orderSummary": "Đơn hàng của bạn",
    "checkout.total": "Tổng cộng",
    "checkout.submit": "Đặt hàng",
    "checkout.submitting": "Đang xử lý...",
    "checkout.loginRequired": "Vui lòng đăng nhập để thanh toán.",
    "checkout.missingRequired": "Vui lòng nhập đủ thông tin giao hàng bắt buộc.",
    "checkout.orderFail": "Đặt hàng thất bại, vui lòng thử lại.",

    "orders.order": "Đơn hàng",
    "orders.orderDate": "Ngày đặt",
    "orders.noDate": "Chưa có ngày",
    "orders.customer": "Khách hàng",
    "orders.contactMissing": "Chưa có liên hệ",
    "orders.addressMissing": "Chưa có địa chỉ",
    "orders.productsMissing": "Chưa có sản phẩm",
    "orders.total": "Tổng tiền",
    "orders.quantity": "Số lượng",
    "orders.unitPrice": "Đơn giá",
    "orders.delete": "Xóa đơn",
    "orders.deleting": "Đang xóa...",
    "orders.deleted": "Đã xóa đơn hàng.",
    "orders.deleteFailed": "Không thể xóa đơn hàng.",
    "orders.empty": "Chưa có đơn hàng nào.",
    "orders.statusUpdated": "Đã cập nhật trạng thái đơn hàng.",
    "orders.statusUpdateFailed": "Không thể cập nhật trạng thái đơn hàng.",
    "orders.cancelled": "Đã hủy đơn hàng.",
    "orders.cancelFailed": "Không thể hủy đơn hàng.",
    "orders.loadFailed": "Không thể tải đơn hàng.",
    "orders.findEmpty": "Không tìm thấy đơn hàng",
    "orders.findEmptyDesc": "Không có đơn hàng phù hợp với bộ lọc hiện tại.",
    "orders.pageCurrent": "Trang hiện tại",
    "orders.pendingCount": "Chờ xử lý",
    "orders.shippingCount": "Đang giao",
    "orders.pageRevenue": "Doanh thu trang",
    "orders.searchPlaceholder":
      "Tìm theo mã đơn, tên, số điện thoại, email, địa chỉ...",
    "orders.allStatuses": "Tất cả trạng thái",
    "orders.detail": "Chi tiết",
    "orders.paymentStatus": "Trạng thái thanh toán",
    "orders.notSelected": "Chưa chọn",
    "orders.unpaid": "Chưa thanh toán",
    "orders.bankChecking": "Đang kiểm tra",
    "orders.showing":
      "Hiển thị {from} đến {to} trong tổng số {total} đơn hàng",
    "orders.page": "Trang",
    "orders.previous": "Trước",
    "orders.next": "Sau",
    "orders.deleteConfirm":
      "Xóa đơn hàng này? Đơn chưa hủy sẽ chuyển sang trạng thái đã hủy để bảo toàn lịch sử.",

    "auth.password": "Mật khẩu",
    "auth.confirmPassword": "Xác nhận mật khẩu",
    "auth.forgotPassword": "Quên mật khẩu?",
    "auth.hidePassword": "Ẩn mật khẩu",
    "auth.showPassword": "Hiện mật khẩu",
    "auth.hideConfirmPassword": "Ẩn xác nhận mật khẩu",
    "auth.showConfirmPassword": "Hiện xác nhận mật khẩu",
    "auth.signIn": "Đăng nhập",
    "auth.signInLoading": "Đang đăng nhập...",
    "auth.signUp": "Đăng ký",
    "auth.signUpLoading": "Đang tạo tài khoản...",
    "auth.noAccount": "Chưa có tài khoản?",
    "auth.haveAccount": "Đã có tài khoản?",
    "auth.emailPasswordRequired": "Vui lòng nhập email và mật khẩu.",
    "auth.passwordMismatch": "Mật khẩu xác nhận không khớp.",
    "auth.passwordMinLength": "Mật khẩu phải có ít nhất 6 ký tự.",
    "auth.signInError": "Đăng nhập thất bại. Vui lòng thử lại.",
    "auth.signUpError": "Đăng ký thất bại. Vui lòng thử lại.",

    "status.pending": "Chờ xử lý",
    "status.processing": "Đang xử lý",
    "status.confirmed": "Đã xác nhận",
    "status.shipped": "Đang giao",
    "status.delivered": "Đã giao",
    "status.completed": "Hoàn thành",
    "status.cancelled": "Đã hủy",
    "status.paid": "Đã thanh toán",
    "status.unpaid": "Chưa thanh toán",
    "status.active": "Đang bán",
    "status.draft": "Bản nháp",
    "status.archived": "Đã ẩn",
    "status.out_of_stock": "Hết hàng",
    "status.low_stock": "Sắp hết hàng",
  },
  en: {
    "common.loading": "Loading...",
    "common.processing": "Processing...",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.close": "Close",
    "common.search": "Search",
    "common.retry": "Retry",
    "common.noData": "No data",
    "common.required": "This field is required.",
    "common.errorGeneric": "Something went wrong. Please try again.",

    "nav.home": "Home",
    "nav.products": "Products",
    "nav.collections": "Collections",
    "nav.about": "About RESEY",
    "nav.contact": "Contact",
    "nav.search": "Search products",
    "nav.cart": "Cart",
    "nav.account": "Account",
    "nav.signIn": "Login",
    "nav.signOut": "Sign out",

    "admin.role": "Admin",
    "admin.profile": "Profile",
    "admin.storeSettings": "Store settings",
    "admin.backStorefront": "View store",
    "admin.noPermission": "You do not have permission to access this page.",
    "admin.goProfile": "Go to profile",
    "admin.overview": "Overview",
    "admin.products": "Products",
    "admin.orders": "Orders",
    "admin.users": "Customers",
    "admin.settings": "Settings",
    "admin.panel": "Admin panel",
    "admin.title": "RESEY Admin",

    "products.inStock": "In stock",
    "products.outOfStock": "Out of stock",
    "products.related": "You may also like",
    "products.material": "Material",
    "products.stock": "Stock",
    "products.selectColor": "Select color",
    "products.selectSize": "Select size",
    "products.quantity": "Quantity",
    "products.description": "Product description",
    "products.sizeGuide": "Size guide",
    "products.sizeSelectHint": "Select a color before choosing size.",
    "products.sizeSelectHintWithColor":
      "Please select a valid size before ordering.",
    "products.sizeSelectHintNoColor":
      "Select a color first to view available sizes.",
    "products.addedToCart": "Added to cart",
    "products.addToCart": "Add to cart",
    "products.fastShipping": "Fast shipping",
    "products.fastShippingDesc": "1-2 days in major cities",
    "products.payment": "Payment",
    "products.paymentDesc": "COD / bank transfer",
    "products.returnPolicy": "Returns",
    "products.returnPolicyDesc": "Within 7 days",
    "products.stockFewLeft": "Only {count} item(s) left",
    "products.chooseSizeError": "Please select a size.",
    "products.chooseColorError": "Please select a color.",
    "products.variantUnavailable": "This size/color variant is unavailable.",
    "products.outOfStockError": "This product is out of stock.",
    "products.quantityExceedsStock": "Quantity exceeds current stock.",

    "cart.title": "Your cart",
    "cart.continueShopping": "Continue shopping",
    "cart.emptyTitle": "Your cart is empty",
    "cart.emptySub": "Add RESEY products to start your order.",
    "cart.viewProducts": "Browse products",
    "cart.checkoutButton": "Proceed to checkout",
    "cart.subtotal": "Subtotal",
    "cart.shippingFee": "Shipping fee",
    "cart.freeShipping": "Free",
    "cart.guestNotice":
      "You can review your cart now. Login is required at checkout.",

    "checkout.sectionLabel": "Checkout",
    "checkout.title": "Shipping information",
    "checkout.fullName": "Full name *",
    "checkout.phone": "Phone number *",
    "checkout.emailOptional": "Email (optional)",
    "checkout.addressDetail": "Detailed address (number, street) *",
    "checkout.ward": "Ward *",
    "checkout.district": "District *",
    "checkout.province": "Province/City *",
    "checkout.note": "Order note",
    "checkout.phoneInvalid":
      "Phone number must start with 0 and contain exactly 10 digits.",
    "checkout.paymentMethod": "Payment method",
    "checkout.cod": "COD",
    "checkout.codDesc": "Cash on delivery",
    "checkout.bankTransfer": "Bank transfer",
    "checkout.bankTransferDesc": "Transfer via bank account",
    "checkout.bankName": "Bank",
    "checkout.bankAccountName": "Account name",
    "checkout.bankAccountNumber": "Account number",
    "checkout.bankNote": "Transfer note will be shown after order: ORDER-{id}",
    "checkout.orderSummary": "Your order",
    "checkout.total": "Total",
    "checkout.submit": "Place order",
    "checkout.submitting": "Processing...",
    "checkout.loginRequired": "Please log in to continue checkout.",
    "checkout.missingRequired":
      "Please complete all required shipping information.",
    "checkout.orderFail": "Could not place order. Please try again.",

    "orders.order": "Order",
    "orders.orderDate": "Order date",
    "orders.noDate": "No date",
    "orders.customer": "Customer",
    "orders.contactMissing": "No contact info",
    "orders.addressMissing": "No address",
    "orders.productsMissing": "No products",
    "orders.total": "Total",
    "orders.quantity": "Quantity",
    "orders.unitPrice": "Unit price",
    "orders.delete": "Delete order",
    "orders.deleting": "Deleting...",
    "orders.deleted": "Order deleted.",
    "orders.deleteFailed": "Could not delete order.",
    "orders.empty": "No orders yet.",
    "orders.statusUpdated": "Order status updated.",
    "orders.statusUpdateFailed": "Could not update order status.",
    "orders.cancelled": "Order cancelled.",
    "orders.cancelFailed": "Could not cancel order.",
    "orders.loadFailed": "Could not load orders.",
    "orders.findEmpty": "No orders found",
    "orders.findEmptyDesc": "No orders match the current filters.",
    "orders.pageCurrent": "Current page",
    "orders.pendingCount": "Pending",
    "orders.shippingCount": "Shipping",
    "orders.pageRevenue": "Page revenue",
    "orders.searchPlaceholder":
      "Search by order ID, name, phone, email, address...",
    "orders.allStatuses": "All statuses",
    "orders.detail": "Details",
    "orders.paymentStatus": "Payment status",
    "orders.notSelected": "Not selected",
    "orders.unpaid": "Unpaid",
    "orders.bankChecking": "Under review",
    "orders.showing": "Showing {from} to {to} of {total} orders",
    "orders.page": "Page",
    "orders.previous": "Previous",
    "orders.next": "Next",
    "orders.deleteConfirm":
      "Delete this order? Active orders will be cancelled instead to preserve history.",

    "auth.password": "Password",
    "auth.confirmPassword": "Confirm password",
    "auth.forgotPassword": "Forgot password?",
    "auth.hidePassword": "Hide password",
    "auth.showPassword": "Show password",
    "auth.hideConfirmPassword": "Hide confirm password",
    "auth.showConfirmPassword": "Show confirm password",
    "auth.signIn": "Sign in",
    "auth.signInLoading": "Signing in...",
    "auth.signUp": "Sign up",
    "auth.signUpLoading": "Creating account...",
    "auth.noAccount": "No account yet?",
    "auth.haveAccount": "Already have an account?",
    "auth.emailPasswordRequired": "Please enter email and password.",
    "auth.passwordMismatch": "Passwords do not match.",
    "auth.passwordMinLength": "Password must be at least 6 characters.",
    "auth.signInError": "Sign in failed. Please try again.",
    "auth.signUpError": "Sign up failed. Please try again.",

    "status.pending": "Pending",
    "status.processing": "Processing",
    "status.confirmed": "Confirmed",
    "status.shipped": "Shipped",
    "status.delivered": "Delivered",
    "status.completed": "Completed",
    "status.cancelled": "Cancelled",
    "status.paid": "Paid",
    "status.unpaid": "Unpaid",
    "status.active": "Active",
    "status.draft": "Draft",
    "status.archived": "Archived",
    "status.out_of_stock": "Out of stock",
    "status.low_stock": "Low stock",
  },
};

const legacyKeyMap: Record<string, string> = {
  nav_home: "nav.home",
  nav_products: "nav.products",
  nav_collection: "nav.collections",
  nav_about: "nav.about",
  nav_contact: "nav.contact",
  nav_search: "nav.search",
  nav_cart: "nav.cart",
  nav_account: "nav.account",
  nav_signin: "nav.signIn",
  admin_role: "admin.role",
  admin_profile: "admin.profile",
  admin_store_settings: "admin.storeSettings",
  admin_back_storefront: "admin.backStorefront",
  admin_signout: "nav.signOut",
  admin_no_permission: "admin.noPermission",
  admin_go_profile: "admin.goProfile",
  loading: "common.loading",
  checkout_section_label: "checkout.sectionLabel",
  checkout_title: "checkout.title",
  checkout_payment_label: "checkout.paymentMethod",
  checkout_order_summary: "checkout.orderSummary",
  checkout_total: "checkout.total",
  checkout_submit: "checkout.submit",
  checkout_submitting: "checkout.submitting",
  cart_title: "cart.title",
  cart_continue_shopping: "cart.continueShopping",
  cart_empty_title: "cart.emptyTitle",
  cart_empty_sub: "cart.emptySub",
  cart_view_products: "cart.viewProducts",
  cart_checkout_button: "cart.checkoutButton",
  cart_subtotal: "cart.subtotal",
  cart_guest_notice: "cart.guestNotice",
  product_size_label: "products.selectSize",
  product_color_label: "products.selectColor",
  product_add_to_cart: "products.addToCart",
  product_out_of_stock: "products.outOfStock",
  product_quantity_label: "products.quantity",
  product_related_title: "products.related",
  products_in_stock: "products.inStock",
  products_out_of_stock: "products.outOfStock",
  status_out_of_stock: "status.out_of_stock",
  status_low_stock: "status.low_stock",
};

function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = params[key];
    return value == null ? "" : String(value);
  });
}

function resolveKey(key: string): string {
  return legacyKeyMap[key] || key;
}

export function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "vi";
  const current = window.localStorage.getItem(STORAGE_KEY);
  return current === "en" ? "en" : "vi";
}

export function setLanguage(language: Locale) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, language);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: language }));
}

export function translate(
  key: string,
  locale: Locale,
  fallback?: string,
  params?: Record<string, string | number>,
) {
  const normalized = resolveKey(key);
  const localized = dictionary[locale][normalized];
  const value = localized || dictionary.vi[normalized] || fallback || normalized;
  return interpolate(value, params);
}

export function tByLocale(
  locale: Locale,
  key: string,
  fallback?: string,
  params?: Record<string, string | number>,
) {
  return translate(key, locale, fallback, params);
}

export function useI18n() {
  const [language, setLanguageState] = useState<Locale>("vi");

  useEffect(() => {
    const apply = () => setLanguageState(getInitialLocale());
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
      locale: language,
      setLanguage,
      setLocale: setLanguage,
      t: (
        key: string,
        fallback?: string,
        params?: Record<string, string | number>,
      ) => translate(key, language, fallback, params),
    }),
    [language],
  );
}
