import type { Json } from "@/types/supabase";

export interface ProductType {
  product_id: string;
  slug?: string | null;
  title: string;
  description: string;
  material?: string | null;
  price: number;
  sale_price?: number | null;
  image?: string | null;
  stock: number;
  sizes?: string[];
  colors?: string[];
  is_active?: boolean | null;
  sku?: string | null;
  category_id?: number | null;
  variants?: ProductVariantType[];
  images?: ProductImageType[];
  category?: {
    id?: number;
    name?: string;
    description?: string;
  };
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ProductImageType {
  id: string;
  product_id: string;
  url: string;
  alt_text?: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at?: string | null;
}

export interface ProductVariantType {
  id: string;
  product_id: string;
  size: string;
  color: string;
  sku?: string | null;
  stock: number;
  price_override?: number | null;
  image_url?: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CartItemType {
  id: number;
  cart_id: number;
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  price: number;
  selected_size?: string | null;
  selected_color?: string | null;
  variant_info?: Json;
  created_at: string;
  updated_at: string;
  product?: ProductType;
}

export type CartStatus = "active" | "abandoned" | "converted";

export interface CartType {
  id: number;
  user_id: string;
  status: CartStatus;
  created_at: string;
  updated_at: string;
  total_items: number;
  total_price: number;
  cart_items?: CartItemType[];
}

export interface OrderItemType {
  id: number;
  order_id: number;
  quantity: number;
  price: number;
  product_id: string;
  variant_id?: string | null;
  selected_size?: string | null;
  selected_color?: string | null;
  variant_info?: Json;
  product_title_snapshot?: string | null;
  product_image_snapshot?: string | null;
  sku_snapshot?: string | null;
  size_snapshot?: string | null;
  color_snapshot?: string | null;
  product?: {
    product_id: string;
    title: string;
    image?: string | null;
  };
}

export type OrderStatus =
  | "pending"
  | "processing"
  | "confirmed"
  | "shipping"
  | "completed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | (string & {});

export interface OrderType {
  id: number;
  user_id: string;
  status: OrderStatus;
  total: number;
  shipping_address_id: number;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_note?: string | null;
  payment_method?: string | null;
  payment_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  order_items?: OrderItemType[];
}

export interface AddressType {
  id: number;
  user_id: string;
  street: string;
  city: string;
  state?: string | null;
  zip_code: string;
  country: string;
  is_default: boolean;
}

export interface ProfileType {
  profile_id: string;
  username?: string | null;
  avatar_url?: string | null;
  email?: string | null;
  role: "admin" | "user" | string;
  is_active?: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface ReviewType {
  id: number;
  product_id: string;
  user_id: string;
  rating: number;
  comment?: string;
  created_at?: string | null;
}

export interface CategoryType {
  id: number;
  name: string;
  description: string;
  parent_id?: number;
}

export interface StoreSettingsType {
  id: 1;
  store_name?: string | null;
  logo_url?: string | null;
  slogan?: string | null;
  hero_badge_text?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  hero_image_url?: string | null;
  hero_primary_button_text?: string | null;
  hero_primary_button_url?: string | null;
  hero_secondary_button_text?: string | null;
  hero_secondary_button_url?: string | null;
  announcement_text?: string | null;
  story_title?: string | null;
  story_description?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  bank_name?: string | null;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  shipping_fee: number;
  free_shipping_threshold?: number | null;
  updated_at?: string | null;
}


