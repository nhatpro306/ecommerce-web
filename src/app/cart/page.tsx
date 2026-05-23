import type { Metadata } from "next";
import CartShoppingPage from "./CartShoppingPage";

export const metadata: Metadata = {
  title: "Giỏ hàng",
  description: "Giỏ hàng RESEY: kiểm tra sản phẩm và tiến hành thanh toán.",
};

export default function ShoppingCart() {
  return <CartShoppingPage />;
}
