import { InfoPage } from "@/components/InfoPage";

export default function ContactPage() {
  return (
    <InfoPage
      eyebrow="Liên hệ"
      title="RESEY luôn sẵn sàng hỗ trợ"
      description="Nếu bạn cần tư vấn size, kiểm tra đơn hàng hoặc hỏi về sản phẩm, hãy liên hệ với RESEY."
      sections={[
        { heading: "Email", body: "support@resey.uk" },
        {
          heading: "Hotline",
          body: "Vui lòng liên hệ qua email để nhận số hotline/Zalo hỗ trợ nhanh theo khung giờ vận hành.",
        },
        {
          heading: "Tư vấn sản phẩm",
          body: "Gửi chiều cao, cân nặng và style bạn thích để shop gợi ý size và phối đồ phù hợp.",
        },
        {
          heading: "Hỗ trợ đơn hàng",
          body: "Khi cần hỗ trợ, vui lòng cung cấp mã đơn hàng để shop kiểm tra nhanh hơn.",
        },
      ]}
    />
  );
}
