import { InfoPage } from "@/components/InfoPage";

export default function SizeGuidePage() {
  return <InfoPage eyebrow="Hướng dẫn chọn size" title="Chọn size dễ hơn" description="Bảng size có thể thay đổi theo từng sản phẩm. Hãy xem mô tả sản phẩm trước khi đặt hàng." sections={[
    { heading: "Áo", body: "Nếu thích form vừa, chọn đúng size thường mặc. Nếu thích oversize streetwear, có thể tăng 1 size." },
    { heading: "Quần", body: "Kiểm tra vòng eo, chiều dài và form ống trước khi chọn. Quần ống rộng thường ưu tiên độ thoải mái." },
    { heading: "Tư vấn", body: "Gửi chiều cao, cân nặng và ảnh sản phẩm bạn muốn mua để shop tư vấn size phù hợp." },
    { heading: "Sai số", body: "Số đo thủ công có thể sai lệch khoảng 1-2cm tùy chất liệu và form sản phẩm." },
  ]} />;
}
