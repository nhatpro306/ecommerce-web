import AdminProductCreatePageClient from "@/components/admin/AdminProductCreatePageClient";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export default async function AdminProductCreatePage() {
  await requireAdmin();
  return <AdminProductCreatePageClient />;
}
