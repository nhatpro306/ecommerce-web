import { z } from "zod";

export const productSchema = z.object({
  title: z.string().trim().min(1, "Product title is required"),
  description: z.string().trim().min(1, "Description is required"),
  price: z.number().positive("Price must be greater than 0"),
  image: z.string().url().optional().or(z.literal("")),
  stock: z.number().int().min(0),
  sku: z.string().trim().optional(),
  category_id: z.number().int().positive().optional(),
  is_active: z.boolean().optional(),
});

export const productVariantSchema = z.object({
  product_id: z.string().uuid(),
  size: z.string().trim().min(1),
  color: z.string().trim().min(1),
  sku: z.string().trim().optional(),
  stock: z.number().int().min(0),
  price_override: z.number().positive().optional().nullable(),
  image_url: z.string().url().optional().nullable(),
  is_active: z.boolean().default(true),
});

export const checkoutItemSchema = z.object({
  product_id: z.string().uuid(),
  variant_id: z.string().uuid().optional().nullable(),
  quantity: z.number().int().positive(),
  selected_size: z.string().trim().optional().nullable(),
  selected_color: z.string().trim().optional().nullable(),
});

export const checkoutSchema = z.object({
  shipping_address_id: z.number().int().positive(),
  payment_method: z.enum(["cod", "bank_transfer"]),
  customer_name: z.string().trim().min(1),
  customer_phone: z.string().trim().min(1),
  customer_email: z.string().email().optional().or(z.literal("")),
  customer_note: z.string().optional(),
  items: z.array(checkoutItemSchema).min(1),
});

export const storeSettingsSchema = z.object({
  store_name: z.string().trim().min(1),
  logo_url: z.string().url().optional().or(z.literal("")),
  contact_email: z.string().email().optional().or(z.literal("")),
  contact_phone: z.string().optional(),
  address: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account_name: z.string().optional(),
  bank_account_number: z.string().optional(),
  shipping_fee: z.number().min(0),
  free_shipping_threshold: z.number().min(0).optional().nullable(),
});

export type ProductFormInput = z.infer<typeof productSchema>;
export type ProductVariantInput = z.infer<typeof productVariantSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type StoreSettingsInput = z.infer<typeof storeSettingsSchema>;
