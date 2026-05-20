Resey - Vietnamese Streetwear E-commerce MVP
Resey is a mobile-first e-commerce MVP for a Vietnamese local brand / streetwear clothing shop. The project was built by improving an existing Next.js + Supabase e-commerce codebase, not by rebuilding from scratch.

The goal is to show a portfolio-ready full-stack flow: product browsing, cart, variant selection, COD / bank transfer checkout, order storage, admin basics, and Vercel deployment readiness.

Features
Local brand homepage for Resey

Product listing with search, category filter, size filter, color filter, stock filter, sort, URL params

Slug-based product detail route: /products/[slug]

Product detail with gallery, size selector, color selector, quantity selector, material, stock status, related products, toast feedback

Cart with selected size/color persistence

Checkout with COD and bank transfer

Order creation with customer name, phone, email, address, note, payment method

Order items store selected size/color and variant metadata

Best-effort stock reduction after checkout

Success page with bank transfer note ORDER-{orderId}

Admin pages from the base repository kept and improved incrementally

SEO basics: metadata, OpenGraph, robots.txt, sitemap.xml

Runs locally without Stripe or Polar keys

Tech Stack
Next.js App Router

TypeScript

Tailwind CSS

shadcn/ui-style components

Supabase Auth + PostgreSQL

TanStack Query

Sonner toast notifications

Vercel deployment

Folder Structure
src/app - App Router pages, layouts, API routes, SEO routes

src/components - shared UI and storefront components

src/context - auth and cart state

src/services - product, cart, order, address, admin service logic

src/lib/supabase - Supabase client/server helpers

src/hooks - TanStack Query hooks

supabase/migrations - safe SQL migrations and seed data

Environment Variables
Create .env.local for local development:

Đoạn mã
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000

NEXT_PUBLIC_BANK_NAME=Vietcombank
NEXT_PUBLIC_BANK_ACCOUNT_NAME=Resey
NEXT_PUBLIC_BANK_ACCOUNT_NUMBER=0123456789
Note: Do not commit real secrets. Keep .env.example as the public template.

Database Setup
Create a Supabase project.

Apply the original base schema for this repository.

Run the migrations in supabase/migrations in order.

Current local brand migrations:

20260520_add_product_is_active_and_seed_local_brand.sql

20260520_z_add_clothing_variant_checkout_fields.sql

These migrations add:

products.is_active

products.slug

products.material

products.sizes

products.colors

cart_items.selected_size

cart_items.selected_color

cart_items.variant_info

order_items.selected_size

order_items.selected_color

order_items.variant_info

orders.customer_name

orders.customer_phone

orders.customer_email

orders.customer_note

Sample local brand categories and products

Run Locally
Bash
npm install --legacy-peer-deps
npm run dev
Open your browser and navigate to:

Plaintext
http://localhost:3000
Quality Checks
Bash
npm run lint
npm run build
Both commands should pass cleanly before attempting deployment.

Payment Strategy
MVP payment methods:

COD (Cash on Delivery)

Bank Transfer

Bank transfer uses environment variables so shop information can be changed seamlessly without editing checkout code.

Legacy Polar/Stripe-related code is kept only for compatibility with the original repository. The main checkout flow does not require Stripe or Polar keys.

Future payment options:
VNPay

Momo

ZaloPay

Stripe demo mode

Deploy To Vercel
Push the repository to GitHub.

Import the GitHub repository into Vercel.

Add the environment variables listed above.

Deploy.

Set NEXT_PUBLIC_SITE_URL to the production Vercel URL.

Connect the deployed app to the correct Supabase project.

Plaintext
GitHub ──> Vercel ──> Supabase
Screenshots
Add screenshots after final deployment:

Homepage

Products page

Product detail page

Cart

Checkout

Admin dashboard

Future Improvements
True variant-level inventory table

Better admin product editor for images, material, sizes, and colors

Order status timeline

Supabase Storage or Cloudinary image upload

Email order confirmation

VNPay or Momo integration

More advanced SEO product metadata
