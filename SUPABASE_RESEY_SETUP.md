# RESEY Supabase Setup

This project uses Supabase for authentication and database data.

## What Supabase Does

Supabase stores:

- users via Supabase Auth
- user profiles
- products and categories
- carts and cart items
- checkout addresses
- orders and order items
- admin role information

GitHub stores code. Vercel deploys code. Supabase stores app data.

## Setup Order

Run SQL in this exact order inside Supabase Dashboard -> SQL Editor.

### 1. Base Schema

Open and run:

```txt
supabase/resey_base_schema.sql
```

This creates the core tables, RLS policies, admin view, and cart total triggers.

### 2. Payment Index

Open and run:

```txt
supabase/migrations/20250101_add_payment_id_index.sql
```

### 3. Product Seed

Open and run:

```txt
supabase/migrations/20260520_add_product_is_active_and_seed_local_brand.sql
```

### 4. Clothing Variant Fields

Open and run:

```txt
supabase/migrations/20260520_z_add_clothing_variant_checkout_fields.sql
```

## Environment Variables

In Vercel, set these values for Production:

```env
NEXT_PUBLIC_SUPABASE_URL=https://aphnynguqhfprzkffbhy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=https://resey.vercel.app
NEXT_PUBLIC_BANK_NAME=Vietcombank
NEXT_PUBLIC_BANK_ACCOUNT_NAME=RESEY
NEXT_PUBLIC_BANK_ACCOUNT_NUMBER=0123456789
```

Do not expose or commit the service role key.

## How To Make Yourself Admin

1. Sign up on the live website.
2. Go to Supabase Dashboard -> Table Editor -> profiles.
3. Find your user row by email.
4. Change `role` from `user` to `admin`.
5. Visit `/admin` again.

## Quick Test Checklist

1. Sign up a test user.
2. Check Supabase Auth -> Users has that user.
3. Check Table Editor -> profiles has a matching profile.
4. Open `/products` and confirm products come from Supabase.
5. Add a product to cart.
6. Check Table Editor -> carts and cart_items.
7. Checkout with COD.
8. Check Table Editor -> orders and order_items.
9. Change your profile role to `admin`.
10. Open `/admin/orders`.

## Important Note

If products show even when Supabase is empty, that is frontend fallback data. Real checkout/order flow needs the SQL schema and seed data above to be applied in Supabase.
