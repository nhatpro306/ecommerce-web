export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          country: string
          created_at: string
          id: number
          is_default: boolean
          state: string | null
          street: string
          updated_at: string | null
          user_id: string
          zip_code: string
        }
        Insert: {
          city: string
          country?: string
          created_at?: string
          id?: number
          is_default?: boolean
          state?: string | null
          street: string
          updated_at?: string | null
          user_id: string
          zip_code: string
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          id?: number
          is_default?: boolean
          state?: string | null
          street?: string
          updated_at?: string | null
          user_id?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: number
          created_at: string
          id: number
          price: number
          product_id: string
          quantity: number
          selected_color: string | null
          selected_size: string | null
          updated_at: string | null
          variant_id: string | null
          variant_info: Json
        }
        Insert: {
          cart_id: number
          created_at?: string
          id?: number
          price: number
          product_id: string
          quantity?: number
          selected_color?: string | null
          selected_size?: string | null
          updated_at?: string | null
          variant_id?: string | null
          variant_info?: Json
        }
        Update: {
          cart_id?: number
          created_at?: string
          id?: number
          price?: number
          product_id?: string
          quantity?: number
          selected_color?: string | null
          selected_size?: string | null
          updated_at?: string | null
          variant_id?: string | null
          variant_info?: Json
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          id: number
          status: string
          total_items: number
          total_price: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          status?: string
          total_items?: number
          total_price?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          status?: string
          total_items?: number
          total_price?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "carts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      categories: {
        Row: {
          description: string
          id: number
          name: string
          parent_id: number | null
        }
        Insert: {
          description?: string
          id?: number
          name: string
          parent_id?: number | null
        }
        Update: {
          description?: string
          id?: number
          name?: string
          parent_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          color_snapshot: string | null
          created_at: string
          id: number
          order_id: number
          price: number
          product_id: string
          product_image_snapshot: string | null
          product_title_snapshot: string | null
          quantity: number
          selected_color: string | null
          selected_size: string | null
          size_snapshot: string | null
          sku_snapshot: string | null
          variant_id: string | null
          variant_info: Json
        }
        Insert: {
          color_snapshot?: string | null
          created_at?: string
          id?: number
          order_id: number
          price: number
          product_id: string
          product_image_snapshot?: string | null
          product_title_snapshot?: string | null
          quantity: number
          selected_color?: string | null
          selected_size?: string | null
          size_snapshot?: string | null
          sku_snapshot?: string | null
          variant_id?: string | null
          variant_info?: Json
        }
        Update: {
          color_snapshot?: string | null
          created_at?: string
          id?: number
          order_id?: number
          price?: number
          product_id?: string
          product_image_snapshot?: string | null
          product_title_snapshot?: string | null
          quantity?: number
          selected_color?: string | null
          selected_size?: string | null
          size_snapshot?: string | null
          sku_snapshot?: string | null
          variant_id?: string | null
          variant_info?: Json
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_note: string | null
          customer_phone: string | null
          id: number
          payment_id: string | null
          payment_method: string | null
          shipping_address_id: number
          status: string
          total: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_note?: string | null
          customer_phone?: string | null
          id?: number
          payment_id?: string | null
          payment_method?: string | null
          shipping_address_id: number
          status?: string
          total: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_note?: string | null
          customer_phone?: string | null
          id?: number
          payment_id?: string | null
          payment_method?: string | null
          shipping_address_id?: number
          status?: string
          total?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          is_primary: boolean
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_variants: {
        Row: {
          color: string
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          price_override: number | null
          product_id: string
          size: string
          sku: string | null
          stock: number
          updated_at: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          price_override?: number | null
          product_id: string
          size: string
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          price_override?: number | null
          product_id?: string
          size?: string
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: number | null
          colors: string[]
          created_at: string
          description: string
          image: string | null
          images: string[]
          is_active: boolean
          is_featured: boolean
          material: string | null
          price: number
          product_id: string
          sale_price: number | null
          sizes: string[]
          sku: string | null
          slug: string | null
          status: string
          stock: number
          title: string
          updated_at: string | null
        }
        Insert: {
          category_id?: number | null
          colors?: string[]
          created_at?: string
          description?: string
          image?: string | null
          images?: string[]
          is_active?: boolean
          is_featured?: boolean
          material?: string | null
          price: number
          product_id?: string
          sale_price?: number | null
          sizes?: string[]
          sku?: string | null
          slug?: string | null
          status?: string
          stock?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          category_id?: number | null
          colors?: string[]
          created_at?: string
          description?: string
          image?: string | null
          images?: string[]
          is_active?: boolean
          is_featured?: boolean
          material?: string | null
          price?: number
          product_id?: string
          sale_price?: number | null
          sizes?: string[]
          sku?: string | null
          slug?: string | null
          status?: string
          stock?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          is_active: boolean
          profile_id: string
          role: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          is_active?: boolean
          profile_id: string
          role?: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          is_active?: boolean
          profile_id?: string
          role?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: number
          product_id: string
          rating: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: number
          product_id: string
          rating: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: number
          product_id?: string
          rating?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
      store_settings: {
        Row: {
          address: string | null
          announcement_text: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_name: string | null
          contact_email: string | null
          contact_phone: string | null
          free_shipping_threshold: number | null
          hero_badge_text: string | null
          hero_image_url: string | null
          hero_primary_button_text: string | null
          hero_primary_button_url: string | null
          hero_secondary_button_text: string | null
          hero_secondary_button_url: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: number
          instagram_url: string | null
          logo_url: string | null
          shipping_fee: number
          slogan: string | null
          store_name: string | null
          story_description: string | null
          story_title: string | null
          tiktok_url: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          announcement_text?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          free_shipping_threshold?: number | null
          hero_badge_text?: string | null
          hero_image_url?: string | null
          hero_primary_button_text?: string | null
          hero_primary_button_url?: string | null
          hero_secondary_button_text?: string | null
          hero_secondary_button_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: number
          instagram_url?: string | null
          logo_url?: string | null
          shipping_fee?: number
          slogan?: string | null
          store_name?: string | null
          story_description?: string | null
          story_title?: string | null
          tiktok_url?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          announcement_text?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          free_shipping_threshold?: number | null
          hero_badge_text?: string | null
          hero_image_url?: string | null
          hero_primary_button_text?: string | null
          hero_primary_button_url?: string | null
          hero_secondary_button_text?: string | null
          hero_secondary_button_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: number
          instagram_url?: string | null
          logo_url?: string | null
          shipping_fee?: number
          slogan?: string | null
          store_name?: string | null
          story_description?: string | null
          story_title?: string | null
          tiktok_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_users: {
        Row: {
          created_at: string | null
          email: string | null
          is_active: boolean | null
          profile_id: string | null
          role: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          is_active?: boolean | null
          profile_id?: string | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          is_active?: boolean | null
          profile_id?: string | null
          role?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      create_order_checkout: { Args: { payload: Json }; Returns: number }
      is_admin: { Args: { check_user_id: string }; Returns: boolean }
      refresh_cart_totals: {
        Args: { target_cart_id: number }
        Returns: undefined
      }
      sync_product_images: {
        Args: { p_product_id: string; p_images: Json }
        Returns: undefined
      }
      validate_cart_item_quantity: {
        Args: { p_cart_item_id: number; p_quantity: number }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
