# SAIGON LOCAL - E-commerce MVP (Next.js + Supabase)

## Project Overview
SAIGON LOCAL is a Vietnamese streetwear e-commerce MVP built on top of an existing Next.js + Supabase foundation.

This version focuses on:
- Mobile-first storefront
- Product browsing and cart
- COD + Bank Transfer checkout
- Order creation and basic admin operations

## Features
- Homepage local brand style (`SAIGON LOCAL`)
- Product listing with search/filter/sort
- Product detail + quantity + size/color selection (UI level)
- Cart management
- Checkout payment methods:
  - COD
  - Bank Transfer
- Order pipeline:
  - Create `orders`
  - Create `order_items`
  - Reduce stock (best effort)
  - Clear cart
  - Success page with transfer note `ORDER-{id}`
- Admin dashboard/products/orders/users
- Product deactivate flow (soft-hide via `is_active`)

## Tech Stack
- Next.js App Router
- TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Auth + Postgres)
- TanStack Query
- Sonner Toast

## Folder Structure
- `src/app` - routes/pages
- `src/components` - reusable UI components
- `src/context` - auth/cart context
- `src/services` - business/service layer
- `src/lib/supabase` - Supabase client/server setup
- `supabase/migrations` - SQL migrations

## Environment Variables
Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000

NEXT_PUBLIC_BANK_NAME=Vietcombank
NEXT_PUBLIC_BANK_ACCOUNT_NAME=SAIGON LOCAL
NEXT_PUBLIC_BANK_ACCOUNT_NUMBER=0123456789
```

## Database Setup
1. Create Supabase project
2. Run base schema from project docs
3. Run migration:
- `supabase/migrations/20260520_add_product_is_active_and_seed_local_brand.sql`

This migration:
- adds `products.is_active`
- seeds categories + local brand sample products

## Run Locally
```bash
npm install --legacy-peer-deps
npm run dev
```

Open: `http://localhost:3000`

## Build / Quality Check
```bash
npm run lint
npm run build
```

## Payment Strategy (MVP)
- Main flow: COD + Bank Transfer
- Polar/Stripe legacy code is kept for compatibility but not used as main checkout flow
- VNPay/Momo are out of scope for this MVP

## Deploy to Vercel
1. Push repository to GitHub
2. Import project on Vercel
3. Add env vars from `.env.local`
4. Deploy

## Screenshots
- Add homepage screenshot
- Add products page screenshot
- Add checkout screenshot
- Add admin dashboard screenshot

## Future Improvements
- Full variant schema (size/color/stock by variant)
- Better order status workflow
- Upload image pipeline (Supabase Storage/Cloudinary)
- Checkout fraud validation and phone verification
- VNPay/Momo integration
