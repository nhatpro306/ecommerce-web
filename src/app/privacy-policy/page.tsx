import { InfoPage } from "@/components/InfoPage";

export default function PrivacyPolicyPage() {
  return <InfoPage eyebrow="Bảo mật thông tin" title="Tôn trọng dữ liệu khách hàng" description="RESEY chỉ thu thập thông tin cần thiết để xử lý đơn hàng và hỗ trợ khách hàng." sections={[
    { heading: "Thông tin thu thập", body: "Tên, số điện thoại, email nếu có, địa chỉ giao hàng và ghi chú đơn hàng." },
    { heading: "Mục đích sử dụng", body: "Dữ liệu được dùng để xác nhận đơn, giao hàng, hỗ trợ đổi trả và chăm sóc khách hàng." },
    { heading: "Không bán dữ liệu", body: "RESEY không bán hoặc chia sẻ thông tin cá nhân cho bên thứ ba ngoài mục đích xử lý đơn hàng." },
    { heading: "Bảo mật", body: "Thông tin được lưu trong hệ thống Supabase với chính sách truy cập phù hợp cho người dùng và admin." },
  ]} />;
}
