export interface ProductType {
  product_id: string;
  slug?: string;
  title: string;
  description: string;
  material?: string;
  price: number;
  image?: string;
  stock: number;
  sizes?: string[];
  colors?: string[];
  is_active?: boolean;
  sku?: string;
  category_id?: number;
  variants?: ProductVariantType[];
  images?: ProductImageType[];
  category?: {
    id?: number;
    name?: string;
    description?: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface ProductImageType {
  id: string;
  product_id: string;
  url: string;
  alt_text?: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at?: string;
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
  created_at?: string;
  updated_at?: string;
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
  variant_info?: Record<string, unknown>;
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
  variant_info?: Record<string, unknown>;
  product_title_snapshot?: string | null;
  product_image_snapshot?: string | null;
  sku_snapshot?: string | null;
  size_snapshot?: string | null;
  color_snapshot?: string | null;
  product?: {
    product_id: string;
    title: string;
    image?: string;
  };
}

export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderType {
  id: number;
  user_id: string;
  status: OrderStatus;
  total: number;
  shipping_address_id: number;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_note?: string;
  payment_method?: string;
  payment_id?: string;
  created_at?: string;
  updated_at?: string;
  order_items?: OrderItemType[];
}

export interface AddressType {
  id: number;
  user_id: string;
  street: string;
  city: string;
  state?: string;
  zip_code: string;
  country: string;
  is_default: boolean;
}

export interface ProfileType {
  profile_id: string;
  username?: string;
  avatar_url?: string;
  email?: string;
  role: "admin" | "user";
  created_at: string;
  updated_at?: string;
}

export interface ReviewType {
  id: number;
  product_id: string;
  user_id: string;
  rating: number;
  comment?: string;
  created_at?: string;
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
  contact_email?: string | null;
  contact_phone?: string | null;
  address?: string | null;
  bank_name?: string | null;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  shipping_fee: number;
  free_shipping_threshold?: number | null;
  updated_at?: string;
}


