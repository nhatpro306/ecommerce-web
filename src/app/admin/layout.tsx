import { requireAdmin } from "@/lib/auth/requireAdmin";
import AdminShellClient from "./AdminShellClient";
import { AdminSessionProvider } from "./AdminSessionContext";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  return (
    <AdminSessionProvider adminEmail={admin.email || ""}>
      <AdminShellClient>{children}</AdminShellClient>
    </AdminSessionProvider>
  );
}
