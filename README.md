# RESEY - Vietnamese Streetwear E-Commerce Platform

A production-oriented clothing e-commerce project built with Next.js, TypeScript, Tailwind CSS, and Supabase. The project keeps the existing MVP design direction while improving safety for a real RESEY shop: server-side admin guards, real product variants, product image uploads, and atomic checkout foundations.

## Features

- Streetwear storefront for RESEY
- Product listing with search, category, size, color, stock, and sorting filters
- Product detail page with image, material, size/color selection, quantity, related products
- Variant-aware cart with guest/local cart support
- COD and bank transfer checkout
- Admin dashboard, products, orders, and users
- Server-side protected admin mutations
- Supabase RLS policies and migration scripts
- Vercel deployment support

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui style components
- Supabase Auth, PostgreSQL, Storage
- TanStack Query
- Zod
- Sonner
- Vercel

## Project Structure

```bash
src/
  app/                 # App Router pages and server actions
  components/          # Shared UI and admin components
  context/             # Auth and cart providers
  hooks/               # TanStack Query hooks
  lib/                 # Supabase, auth guards, validation
  services/            # Product, cart, order, admin, storage helpers
  types.ts             # App-level TypeScript models

supabase/
  migrations/          # Safe SQL migrations
  resey_base_schema.sql
```

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000

NEXT_PUBLIC_BANK_NAME=Vietcombank
NEXT_PUBLIC_BANK_ACCOUNT_NAME=RESEY
NEXT_PUBLIC_BANK_ACCOUNT_NUMBER=0123456789

# Development only. Keep false in production.
NEXT_PUBLIC_USE_DEMO_DATA=false
```

Production safety rule: do not set `NEXT_PUBLIC_USE_DEMO_DATA=true` on Vercel production. Demo products are only for local development when Supabase is unavailable.

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/resey_base_schema.sql` in SQL Editor for a fresh database.
3. Run migrations in order from `supabase/migrations`.
4. The latest production migration adds:
   - `product_images`
   - `product_variants`
   - `store_settings`
   - order item snapshot fields
   - storage bucket `product-images`
   - RLS policies
   - RPC function `create_order_checkout(payload jsonb)`

## Production Checkout Model

Checkout should use Supabase RPC `create_order_checkout`.

The RPC:

- validates the authenticated user
- validates address ownership
- locks variant rows with `FOR UPDATE`
- validates stock server-side
- calculates total from database prices
- inserts order and order item snapshots
- decreases variant stock atomically
- marks the cart converted

If stock changes before checkout, the customer sees a clear stock error.

## Admin Safety

Admin write actions are protected server-side with `requireAdmin()`.

Protected mutations include:

- product create/update/deactivate
- order status update

Client-side redirects are still useful for UX, but they are not trusted for security.

## Product Images

Supabase Storage bucket: `product-images`.

Upload rules:

- allowed: JPEG, PNG, WebP
- max file size: 5MB
- path format: `product-images/{productId}/{uuid}.{ext}`
- admin can upload/manage
- public can read images

The admin product form supports upload previews and primary image selection for existing products.

## Local Development

```bash
npm install --legacy-peer-deps
npm run dev
```

Open:

```bash
http://localhost:3000
```

## Quality Checks

Run before pushing or deploying:

```bash
npm run lint
npm run build
```

## Smoke Test Checklist

- Home page loads
- Products page loads
- Product detail page loads
- Add size/color variant to cart
- Cart quantity update works
- Cart remove item works
- Checkout creates order with COD
- Checkout creates order with bank transfer
- Admin can create product
- Admin can upload product image
- Admin can edit product stock/variant stock
- Admin can update order status
- Product image appears in product card/detail
- Production does not show demo products when Supabase fails

## Deployment

1. Push to GitHub.
2. Import the repo into Vercel.
3. Add production environment variables.
4. Run Supabase migrations before testing checkout/admin.
5. Deploy.

## Future Improvements

- Full variant manager UI
- Store settings admin page
- Email notifications with Resend
- Low-stock dashboard
- Product SEO fields
- Print/export order layout
- Remove unused Polar legacy code after confirming it is no longer needed

## License

Educational and portfolio project.
