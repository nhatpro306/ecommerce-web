"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
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
  slogan: string;
  hero_badge_text: string;
  hero_title: string;
  hero_subtitle: string;
  hero_image_url: string;
  hero_primary_button_text: string;
  hero_primary_button_url: string;
  hero_secondary_button_text: string;
  hero_secondary_button_url: string;
  announcement_text: string;
  story_title: string;
  story_description: string;
  instagram_url: string;
  tiktok_url: string;
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
  slogan: "",
  hero_badge_text: "",
  hero_title: "",
  hero_subtitle: "",
  hero_image_url: "",
  hero_primary_button_text: "",
  hero_primary_button_url: "",
  hero_secondary_button_text: "",
  hero_secondary_button_url: "",
  announcement_text: "",
  story_title: "",
  story_description: "",
  instagram_url: "",
  tiktok_url: "",
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
          slogan: settings.slogan || "",
          hero_badge_text: settings.hero_badge_text || "",
          hero_title: settings.hero_title || "",
          hero_subtitle: settings.hero_subtitle || "",
          hero_image_url: settings.hero_image_url || "",
          hero_primary_button_text: settings.hero_primary_button_text || "",
          hero_primary_button_url: settings.hero_primary_button_url || "",
          hero_secondary_button_text: settings.hero_secondary_button_text || "",
          hero_secondary_button_url: settings.hero_secondary_button_url || "",
          announcement_text: settings.announcement_text || "",
          story_title: settings.story_title || "",
          story_description: settings.story_description || "",
          instagram_url: settings.instagram_url || "",
          tiktok_url: settings.tiktok_url || "",
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
      ...formData,
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
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">RESEY Admin</p>
        <h1 className="mt-2 text-3xl font-black uppercase">Cấu hình cửa hàng</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-4 border border-zinc-200 p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.16em]">1. Thương hiệu</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tên cửa hàng" value={formData.store_name} onChange={(v) => handleChange("store_name", v)} error={errors.store_name} />
            <Field label="Logo URL" value={formData.logo_url} onChange={(v) => handleChange("logo_url", v)} error={errors.logo_url} placeholder="https://..." />
            <Field label="Slogan" value={formData.slogan} onChange={(v) => handleChange("slogan", v)} />
          </div>
        </section>

        <section className="space-y-4 border border-zinc-200 p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.16em]">2. Banner trang chủ</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Hero badge text" value={formData.hero_badge_text} onChange={(v) => handleChange("hero_badge_text", v)} />
            <Field label="Hero title" value={formData.hero_title} onChange={(v) => handleChange("hero_title", v)} />
            <Field label="Hero subtitle" value={formData.hero_subtitle} onChange={(v) => handleChange("hero_subtitle", v)} />
            <Field label="Hero image URL" value={formData.hero_image_url} onChange={(v) => handleChange("hero_image_url", v)} error={errors.hero_image_url} placeholder="https://..." />
          </div>
        </section>

        <section className="space-y-4 border border-zinc-200 p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.16em]">3. Nút CTA</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nút chính - Text" value={formData.hero_primary_button_text} onChange={(v) => handleChange("hero_primary_button_text", v)} />
            <Field label="Nút chính - URL" value={formData.hero_primary_button_url} onChange={(v) => handleChange("hero_primary_button_url", v)} error={errors.hero_primary_button_url} placeholder="https://..." />
            <Field label="Nút phụ - Text" value={formData.hero_secondary_button_text} onChange={(v) => handleChange("hero_secondary_button_text", v)} />
            <Field label="Nút phụ - URL" value={formData.hero_secondary_button_url} onChange={(v) => handleChange("hero_secondary_button_url", v)} error={errors.hero_secondary_button_url} placeholder="https://..." />
          </div>
        </section>

        <section className="space-y-4 border border-zinc-200 p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.16em]">4. Thông báo đầu trang</h2>
          <Field label="Announcement text" value={formData.announcement_text} onChange={(v) => handleChange("announcement_text", v)} />
        </section>

        <section className="space-y-4 border border-zinc-200 p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.16em]">5. Câu chuyện thương hiệu</h2>
          <Field label="Story title" value={formData.story_title} onChange={(v) => handleChange("story_title", v)} />
          <div>
            <Label>Story description</Label>
            <textarea
              value={formData.story_description}
              onChange={(event) => handleChange("story_description", event.target.value)}
              rows={4}
              className="w-full border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
        </section>

        <section className="space-y-4 border border-zinc-200 p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.16em]">6. Mạng xã hội</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Instagram URL" value={formData.instagram_url} onChange={(v) => handleChange("instagram_url", v)} error={errors.instagram_url} placeholder="https://instagram.com/..." />
            <Field label="TikTok URL" value={formData.tiktok_url} onChange={(v) => handleChange("tiktok_url", v)} error={errors.tiktok_url} placeholder="https://tiktok.com/@..." />
          </div>
        </section>

        <section className="space-y-4 border border-zinc-200 p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.16em]">7. Liên hệ</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Email liên hệ" value={formData.contact_email} onChange={(v) => handleChange("contact_email", v)} error={errors.contact_email} />
            <Field label="Số điện thoại" value={formData.contact_phone} onChange={(v) => handleChange("contact_phone", v)} />
          </div>
          <Field label="Địa chỉ" value={formData.address} onChange={(v) => handleChange("address", v)} />
        </section>

        <section className="space-y-4 border border-zinc-200 p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.16em]">8. Thanh toán ngân hàng</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Tên ngân hàng" value={formData.bank_name} onChange={(v) => handleChange("bank_name", v)} />
            <Field label="Tên tài khoản" value={formData.bank_account_name} onChange={(v) => handleChange("bank_account_name", v)} />
            <Field label="Số tài khoản" value={formData.bank_account_number} onChange={(v) => handleChange("bank_account_number", v)} />
          </div>
        </section>

        <section className="space-y-4 border border-zinc-200 p-5">
          <h2 className="text-sm font-black uppercase tracking-[0.16em]">9. Giao hàng</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Phí ship mặc định" value={formData.shipping_fee} onChange={(v) => handleChange("shipping_fee", v)} type="number" error={errors.shipping_fee} />
            <Field label="Miễn ship từ" value={formData.free_shipping_threshold} onChange={(v) => handleChange("free_shipping_threshold", v)} type="number" error={errors.free_shipping_threshold} />
          </div>
        </section>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="rounded-none bg-zinc-950 text-white hover:bg-zinc-800">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Đang lưu..." : "Lưu cấu hình"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        placeholder={placeholder}
        className="rounded-none"
      />
      {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
    </div>
  );
}

