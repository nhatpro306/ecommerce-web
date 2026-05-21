import { InfoPage } from "@/components/InfoPage";

export default function ShippingPolicyPage() {
  return <InfoPage eyebrow="Chính sách giao hàng" title="Giao hàng toàn quốc" description="RESEY hỗ trợ giao hàng cho đơn COD và chuyển khoản ngân hàng." sections={[
    { heading: "Thời gian xử lý", body: "Đơn hàng thường được xác nhận trong vòng 24 giờ làm việc sau khi đặt hàng thành công." },
    { heading: "Thời gian giao", body: "Nội thành thường 1-3 ngày làm việc, tỉnh thành khác khoảng 3-7 ngày tùy đơn vị vận chuyển." },
    { heading: "Phí vận chuyển", body: "Phí ship được tính theo cấu hình shop và có thể thay đổi theo khu vực hoặc chương trình ưu đãi." },
    { heading: "Lưu ý", body: "Vui lòng nhập đúng số điện thoại và địa chỉ chi tiết để tránh giao hàng thất bại." },
  ]} />;
}
