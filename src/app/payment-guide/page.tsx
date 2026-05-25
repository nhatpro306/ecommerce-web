import { InfoPage } from "@/components/InfoPage";

export default function PaymentGuidePage() {
  return <InfoPage eyebrow="Hướng dẫn thanh toán" title="COD hoặc chuyển khoản" description="RESEY hiện hỗ trợ hai phương thức thanh toán chính cho MVP: COD và chuyển khoản ngân hàng." sections={[
    { heading: "COD", body: "Khách hàng thanh toán khi nhận hàng. Shop sẽ liên hệ xác nhận trước khi giao." },
    { heading: "Chuyển khoản", body: "Tại trang checkout, khi chọn chuyển khoản bạn sẽ thấy ngay ngân hàng, số tài khoản và nội dung mẫu ORDER-TEMP. Sau khi đặt hàng thành công, hệ thống sẽ cung cấp mã ORDER-{mã đơn} để chuyển khoản chính thức." },
    { heading: "Xác nhận", body: "Với chuyển khoản, shop sẽ kiểm tra giao dịch và xác nhận đơn trước khi xử lý giao hàng." },
    { heading: "Lưu ý", body: "Không chuyển khoản nếu thông tin đơn hàng chưa đúng. Hãy liên hệ shop nếu cần sửa thông tin." },
  ]} />;
}
