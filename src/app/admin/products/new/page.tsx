import { redirect } from "next/navigation";

export default function AdminProductCreateRedirectPage() {
  redirect("/admin/products?create=1");
}
