import { Suspense } from "react";
import AdminDashboardClient from "./AdminDashboardClient";
import { LoadingSpinner } from "@/components/LoadingSpinner";

function DashboardFallback() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner />
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <AdminDashboardClient />
    </Suspense>
  );
}
