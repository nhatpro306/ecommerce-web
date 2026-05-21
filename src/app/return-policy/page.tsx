import { InfoPage } from "@/components/InfoPage";

export default function ReturnPolicyPage() {
  return <InfoPage eyebrow="Chính sách đổi trả" title="Đổi trả rõ ràng và công bằng" description="RESEY hỗ trợ đổi trả trong các trường hợp sản phẩm lỗi, sai mẫu hoặc sai size do shop xử lý." sections={[
    { heading: "Điều kiện", body: "Sản phẩm còn nguyên tem mác, chưa giặt, chưa qua sử dụng và được phản hồi trong thời gian quy định." },
    { heading: "Thời hạn", body: "Khách hàng nên liên hệ trong vòng 7 ngày kể từ khi nhận hàng để được hỗ trợ nhanh nhất." },
    { heading: "Không áp dụng", body: "Không hỗ trợ đổi trả với sản phẩm đã sử dụng, hư hỏng do bảo quản sai hoặc đặt nhầm size từ phía khách hàng." },
    { heading: "Cách xử lý", body: "Gửi mã đơn, ảnh sản phẩm và mô tả vấn đề để shop kiểm tra và hướng dẫn bước tiếp theo." },
  ]} />;
}
