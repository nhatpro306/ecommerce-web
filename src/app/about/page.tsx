import { InfoPage } from "@/components/InfoPage";

export default function AboutPage() {
  return <InfoPage eyebrow="Về RESEY" title="Local brand cho nhịp sống phố" description="RESEY xây dựng streetwear dễ mặc, rõ cá tính và phù hợp với đời sống hằng ngày của giới trẻ Việt." sections={[
    { heading: "Tinh thần", body: "Chúng tôi tập trung vào form thoải mái, màu sắc dễ phối và chi tiết đủ nổi bật để người mặc tự tin thể hiện cá tính." },
    { heading: "Sản phẩm", body: "Các dòng chính gồm áo thun, hoodie, quần và phụ kiện. Mỗi sản phẩm hướng đến tính ứng dụng, độ bền và phong cách streetwear hiện đại." },
    { heading: "Khách hàng", body: "RESEY dành cho người thích sự tối giản nhưng không muốn nhạt nhòa: đi học, đi làm, đi chơi đều có thể mặc được." },
    { heading: "Định hướng", body: "Chúng tôi ưu tiên trải nghiệm mua hàng rõ ràng, hình ảnh thật, thông tin size minh bạch và hỗ trợ nhanh sau khi đặt hàng." },
  ]} />;
}
