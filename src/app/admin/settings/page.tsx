"use client";

import { useEffect, useState } from "react";
import { Building2, CreditCard, Save, Settings, Truck } from "lucide-react";
import { toast } from "sonner";

import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { storeSettingsSchema } from "@/lib/validation/schemas";

import {
  getAdminStoreSettingsAction,
  updateAdminStoreSettingsAction,
} from "./actions";

interface SettingsFormData {
  store_name: string;
  logo_url: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  shipping_fee: string;
  free_shipping_threshold: string;
}

const emptyForm: SettingsFormData = {
  store_name: "RESEY",
  logo_url: "",
  contact_email: "",
  contact_phone: "",
  address: "",
  bank_name: "",
  bank_account_name: "",
  bank_account_number: "",
  shipping_fee: "0",
  free_shipping_threshold: "",
};

export default function AdminSettingsPage() {
  const [formData, setFormData] = useState<SettingsFormData>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const settings = await getAdminStoreSettingsAction();
        setFormData({
          store_name: settings.store_name || "RESEY",
          logo_url: settings.logo_url || "",
          contact_email: settings.contact_email || "",
          contact_phone: settings.contact_phone || "",
          address: settings.address || "",
          bank_name: settings.bank_name || "",
          bank_account_name: settings.bank_account_name || "",
          bank_account_number: settings.bank_account_number || "",
          shipping_fee: String(settings.shipping_fee || 0),
          free_shipping_threshold: settings.free_shipping_threshold
            ? String(settings.free_shipping_threshold)
            : "",
        });
      } catch (error) {
        console.error("Failed to load store settings:", error);
        toast.error("Không thể tải cấu hình cửa hàng");
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  const handleChange = (field: keyof SettingsFormData, value: string) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    if (errors[field]) {
      setErrors((previous) => ({ ...previous, [field]: "" }));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});

    const parsed = storeSettingsSchema.safeParse({
      store_name: formData.store_name,
      logo_url: formData.logo_url,
      contact_email: formData.contact_email,
      contact_phone: formData.contact_phone,
      address: formData.address,
      bank_name: formData.bank_name,
      bank_account_name: formData.bank_account_name,
      bank_account_number: formData.bank_account_number,
      shipping_fee: Number.parseFloat(formData.shipping_fee || "0"),
      free_shipping_threshold: formData.free_shipping_threshold
        ? Number.parseFloat(formData.free_shipping_threshold)
        : null,
    });

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0]?.toString();
        if (key) nextErrors[key] = issue.message;
      });
      setErrors(nextErrors);
      return;
    }

    try {
      setSaving(true);
      await updateAdminStoreSettingsAction(parsed.data);
      toast.success("Đã lưu cấu hình cửa hàng");
    } catch (error) {
      console.error("Failed to save store settings:", error);
      toast.error("Không thể lưu cấu hình cửa hàng");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex h-64 items-center justify-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
          RESEY Admin
        </p>
        <h1 className="mt-2 text-3xl font-black uppercase">Cấu hình cửa hàng</h1>
        <p className="mt-1 text-zinc-500">
          Quản lý thông tin thương hiệu, thanh toán chuyển khoản và phí vận chuyển.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-4 border border-zinc-200 p-5">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em]">
            <Building2 className="h-4 w-4" />
            Thông tin cửa hàng
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="store_name">Tên cửa hàng</Label>
              <Input
                id="store_name"
                value={formData.store_name}
                onChange={(event) => handleChange("store_name", event.target.value)}
                className="rounded-none"
              />
              {errors.store_name && <p className="mt-1 text-sm text-rose-600">{errors.store_name}</p>}
            </div>
            <div>
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input
                id="logo_url"
                value={formData.logo_url}
                onChange={(event) => handleChange("logo_url", event.target.value)}
                className="rounded-none"
                placeholder="https://..."
              />
              {errors.logo_url && <p className="mt-1 text-sm text-rose-600">{errors.logo_url}</p>}
            </div>
            <div>
              <Label htmlFor="contact_email">Email liên hệ</Label>
              <Input
                id="contact_email"
                value={formData.contact_email}
                onChange={(event) => handleChange("contact_email", event.target.value)}
                className="rounded-none"
                placeholder="support@resey.vn"
              />
              {errors.contact_email && <p className="mt-1 text-sm text-rose-600">{errors.contact_email}</p>}
            </div>
            <div>
              <Label htmlFor="contact_phone">Số điện thoại</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(event) => handleChange("contact_phone", event.target.value)}
                className="rounded-none"
                placeholder="090..."
              />
            </div>
          </div>
          <div>
            <Label htmlFor="address">Địa chỉ</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(event) => handleChange("address", event.target.value)}
              className="rounded-none"
              placeholder="Quận 1, TP.HCM"
            />
          </div>
        </section>

        <section className="space-y-4 border border-zinc-200 p-5">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em]">
            <CreditCard className="h-4 w-4" />
            Chuyển khoản ngân hàng
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="bank_name">Tên ngân hàng</Label>
              <Input
                id="bank_name"
                value={formData.bank_name}
                onChange={(event) => handleChange("bank_name", event.target.value)}
                className="rounded-none"
                placeholder="Vietcombank"
              />
            </div>
            <div>
              <Label htmlFor="bank_account_name">Tên tài khoản</Label>
              <Input
                id="bank_account_name"
                value={formData.bank_account_name}
                onChange={(event) => handleChange("bank_account_name", event.target.value)}
                className="rounded-none"
                placeholder="RESEY"
              />
            </div>
            <div>
              <Label htmlFor="bank_account_number">Số tài khoản</Label>
              <Input
                id="bank_account_number"
                value={formData.bank_account_number}
                onChange={(event) => handleChange("bank_account_number", event.target.value)}
                className="rounded-none"
                placeholder="0123456789"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4 border border-zinc-200 p-5">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em]">
            <Truck className="h-4 w-4" />
            Vận chuyển
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="shipping_fee">Phí ship mặc định</Label>
              <Input
                id="shipping_fee"
                type="number"
                min="0"
                value={formData.shipping_fee}
                onChange={(event) => handleChange("shipping_fee", event.target.value)}
                className="rounded-none"
              />
              {errors.shipping_fee && <p className="mt-1 text-sm text-rose-600">{errors.shipping_fee}</p>}
            </div>
            <div>
              <Label htmlFor="free_shipping_threshold">Miễn ship từ</Label>
              <Input
                id="free_shipping_threshold"
                type="number"
                min="0"
                value={formData.free_shipping_threshold}
                onChange={(event) => handleChange("free_shipping_threshold", event.target.value)}
                className="rounded-none"
                placeholder="Để trống nếu không dùng"
              />
              {errors.free_shipping_threshold && (
                <p className="mt-1 text-sm text-rose-600">{errors.free_shipping_threshold}</p>
              )}
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="rounded-none bg-zinc-950 text-white hover:bg-zinc-800"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Đang lưu..." : "Lưu cấu hình"}
          </Button>
        </div>
      </form>

      <div className="border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
        <Settings className="mr-2 inline h-4 w-4" />
        Các thông tin này dùng cho checkout COD/chuyển khoản và footer trong các phase sau.
      </div>
    </div>
  );
}
