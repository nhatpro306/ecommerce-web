import { InfoPage } from "@/components/InfoPage";

export default function PaymentGuidePage() {
  return <InfoPage eyebrow="Hướng dẫn thanh toán" title="COD hoặc chuyển khoản" description="RESEY hiện hỗ trợ hai phương thức thanh toán chính cho MVP: COD và chuyển khoản ngân hàng." sections={[
    { heading: "COD", body: "Khách hàng thanh toán khi nhận hàng. Shop sẽ liên hệ xác nhận trước khi giao." },
    { heading: "Chuyển khoản", body: "Sau khi đặt hàng, trang thành công sẽ hiển thị ngân hàng, số tài khoản và nội dung chuyển khoản ORDER-{mã đơn}." },
    { heading: "Xác nhận", body: "Với chuyển khoản, shop sẽ kiểm tra giao dịch và xác nhận đơn trước khi xử lý giao hàng." },
    { heading: "Lưu ý", body: "Không chuyển khoản nếu thông tin đơn hàng chưa đúng. Hãy liên hệ shop nếu cần sửa thông tin." },
  ]} />;
}
