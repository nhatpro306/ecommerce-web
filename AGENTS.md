# AGENTS.md

## Role

You are an AI coding agent working inside this repository.

Improve this RESEY e-commerce project into a modern Vietnamese local brand clothing shop.

Main rule:
- Do not rebuild from scratch.
- Do not turn this into another platform.
- Reuse existing Next.js, Supabase, cart, checkout, product, order, admin, and UI logic whenever possible.
- Keep changes small, safe, and focused.

---

## Token-Saving Mode

Use token-saving mode by default.

Rules:
- Be concise.
- Do not print full file contents unless explicitly requested.
- Do not repeat this AGENTS.md back to the user.
- Do not scan unrelated folders.
- Do not refactor unrelated code.
- Do not suggest unrelated features.
- Prefer summaries, diffs, and file lists.
- Stop after completing the current phase.

Before editing:
1. Inspect only files needed for the current task.
2. Briefly report the root cause or finding.
3. List exact files you plan to change.
4. Wait for confirmation if the change affects database schema, RLS, auth, checkout, or production data.

After editing:
1. List changed files.
2. Summarize the fix in 5 lines or less.
3. Report lint/build/typecheck results if run.
4. Report manual Supabase/Vercel steps if any.
5. Stop.

For follow-up prompts:
- Continue from the previous plan.
- Do not re-scan the whole repo unless necessary.
- Do not re-explain solved context.

---

## Current Priorities

Do these in order.

### 1. Fix Product Visibility

Products must appear on `/products` when:
- `products.is_active = true`
- and `products.stock > 0`
- or active `product_variants.stock > 0`

Rules:
- Use active variant stock as source of truth when variants exist.
- Do not hide a valid product because `products.stock` is stale.
- Do not hide server-rendered products just because client refetch fails.
- Product cards should use primary `product_images` first, then `products.image` fallback.
- Public users must be able to read active products, active variants, product images, and categories.

### 2. Fix Admin Product Update

Admin must be able to update:
- title
- price
- category
- images
- sizes
- colors
- variants
- stock
- active/hidden status

Rules:
- Update by `product_id`.
- Preserve image, category, slug, stock, sizes, and colors unless intentionally changed.
- Recalculate `products.stock` from active variants when variants exist.
- Sync `products.sizes` and `products.colors` from active variants.
- Revalidate `/products`, `/admin/products`, `/`, and product detail routes.
- Show clear Vietnamese error messages.

### 3. Supabase Safety

Do not:
- drop tables
- truncate tables
- mass delete production data
- disable RLS globally
- expose service role keys to client
- commit real `.env` files
- run destructive SQL without explicit approval

Allowed when needed:
- `alter table ... add column if not exists`
- `drop policy if exists`
- `create policy`
- safe migration files in `supabase/migrations`

If Supabase MCP is available:
1. Inspect schema and RLS first.
2. Compare schema with TypeScript types.
3. Report root cause before schema changes.
4. Create migration files instead of manually changing production data.

---

## Admin UI Direction

Use TailAdmin only as a visual reference.

References:
- https://github.com/TailAdmin/free-nextjs-admin-dashboard
- https://nextjs-demo.tailadmin.com/form-elements

Allowed:
- Borrow layout ideas.
- Recreate sidebar, header, cards, tables, forms, charts.

Not allowed:
- Do not replace the whole app with TailAdmin.
- Do not replace routing.
- Do not replace Supabase logic without clear reason.
- Do not import large unrelated TailAdmin code.

Admin UI should include:
- sidebar
- top header
- account menu at top-right
- avatar/name/role
- VI/EN language switcher
- stat cards
- recent orders table
- low stock products table
- quick actions

---

## Admin Language Switcher

Add per-user admin language choice.

Requirements:
- Options: Vietnamese and English.
- Default: Vietnamese.
- Each admin chooses independently.
- Do not store admin language in `store_settings`.
- Prefer `profiles.admin_language` if available.
- Fallback to `localStorage`.
- Only translate admin UI labels.
- Do not translate product names, product descriptions, customer names, order notes, or seller-entered content.

---

## Homepage Customization From Admin

Admin settings should allow seller to edit:
- store name
- logo
- slogan
- hero badge text
- hero title
- hero subtitle
- hero image URL
- primary CTA text/link
- secondary CTA text/link
- announcement text
- brand story title
- brand story description
- Instagram URL
- TikTok URL
- contact info
- bank transfer info
- shipping settings

Homepage `/` must read values from Supabase `store_settings` and use safe fallback values when empty.

---

## Project Goal

Build a modern, mobile-first e-commerce website for a Vietnamese local brand / streetwear clothing shop.

The site should work as:
- a real MVP shop
- a university portfolio project
- a job hunting portfolio
- a demo of frontend, backend, database, admin, checkout, and deployment skills

Brand:
- RESEY

Style:
- Vietnamese streetwear
- premium but simple
- Gen Z friendly
- mobile-first
- black / white / gray / beige palette
- clean typography
- no horizontal overflow on mobile

Tone:
- minimal
- confident
- fashion-focused
- youthful
- modern

---

## Preferred Stack

Use existing stack if already present.

Preferred:
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- lucide-react
- existing cart state management
- React Hook Form
- Zod
- Supabase PostgreSQL
- Supabase Storage or Cloudinary
- Vercel

Do not add heavy dependencies unless clearly needed.

---

## Payment Strategy

For MVP, support only:
1. COD
2. Bank Transfer

Do not implement unless explicitly requested:
- Stripe production payment
- Momo
- VNPay
- ZaloPay

If Stripe exists:
- keep it only if it does not break the app
- hide it from main checkout UI
- do not require Stripe keys to run locally

Checkout must:
1. read cart
2. collect customer name, phone, optional email, address, note
3. allow COD or Bank Transfer
4. create order
5. create order items
6. reduce stock if inventory exists
7. clear cart after success
8. show bank transfer info if selected

Bank transfer info should be editable from admin settings or environment fallback.

---

## Required Pages

### Homepage `/`
Must include:
- navbar
- hero
- featured products
- new drop
- categories
- brand story
- footer

Hero text/image should be customizable from admin settings when possible.

### Products `/products`
Must include:
- product grid
- search
- category filter
- size/color filter if possible
- sort by latest / price low-high / price high-low
- loading, empty, and error states

### Product Detail `/products/[slug]`
Must include:
- image gallery
- name
- price
- description
- material
- size/color selector
- quantity selector
- stock status
- add to cart
- related products if possible

Validation:
- no add to cart without required options
- no quantity greater than stock
- show toast after adding

### Cart `/cart`
Must include:
- cart items
- image/name/size/color/quantity/price
- remove/update quantity
- subtotal
- checkout button
- empty state

### Checkout `/checkout`
Must include:
- customer name
- phone
- optional email
- address
- optional note
- COD / Bank Transfer
- validation
- success page/message

### Admin `/admin`
Must include:
- total products
- total orders
- pending orders
- revenue if possible
- low stock products
- recent orders
- quick actions

### Admin Products
Must include:
- product table
- create/edit product
- deactivate instead of hard delete if possible
- category, price, images, variants, stock
- visibility/debug badges

Recommended badges:
- Đang bán
- Đang ẩn
- Hết hàng
- Sắp hết hàng
- Thiếu ảnh
- Không hiện ngoài web

### Admin Orders
Must include:
- order list
- customer info
- order items
- total amount
- payment method
- payment status if available
- status update

Order statuses:
- pending
- confirmed
- shipping
- completed
- cancelled

### Admin Settings
Must include:
- brand
- homepage hero/banner
- CTA buttons
- announcement
- brand story
- social links
- contact
- bank transfer
- shipping

UI must be easy for non-technical sellers.

---

## Product Data

Use local brand clothing products, not generic demo products.

Examples:
1. RESEY Oversized Tee
2. RESEY Minimal Hoodie
3. RESEY Street Cargo Pants
4. RESEY Logo Cap
5. RESEY Heavyweight Tee
6. RESEY Dragon Graphic Tee
7. RESEY Boxy Tee
8. RESEY Club Hoodie

Each product should include:
- name
- slug
- VND price
- category
- description
- material
- sizes S/M/L/XL
- colors Black/White/Gray
- stock
- image

Price format:
- `450000` -> `450.000₫`

---

## Code Quality Rules

Important:
- Do not hardcode main business logic.
- Do not expose API keys.
- Keep `.env.example`.
- Keep components reusable.
- Use TypeScript properly.
- Handle loading, empty, and error states.
- Avoid changing unrelated files.
- Avoid over-engineering.
- Prefer small safe changes.
- Run lint/build/typecheck when possible.

---

## Environment Variables

Make sure `.env.example` exists and every variable is on its own line.

Recommended:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=

NEXT_PUBLIC_BANK_NAME=
NEXT_PUBLIC_BANK_ACCOUNT_NAME=
NEXT_PUBLIC_BANK_ACCOUNT_NUMBER=

NEXT_PUBLIC_USE_DEMO_DATA=false

RESEND_API_KEY=
RESEND_FROM_EMAIL=
SELLER_NOTIFICATION_EMAIL=
```

Do not require Stripe keys for MVP.

---

## Development Order

Current order:

1. Inspect repo.
2. Create checklist.
3. Fix product visibility on `/products`.
4. Fix admin product update.
5. Sync product stock, sizes, and colors from variants.
6. Check Supabase RLS and create safe migration if needed.
7. Add product visibility/debug badges in admin.
8. Upgrade admin layout with TailAdmin-style sidebar/header.
9. Add top-right account menu.
10. Add per-user VI/EN admin language switcher.
11. Improve admin dashboard cards/tables.
12. Improve admin products UI.
13. Improve admin orders UI.
14. Extend admin settings for slogan/banner/hero image.
15. Update homepage to read settings from Supabase.
16. Add upload support only if it fits existing Supabase Storage flow.
17. Update README if behavior changed.
18. Run lint/build/typecheck.
19. Report changed files, migrations, tests, and remaining TODOs.

Do not jump to unrelated features before fixing product visibility and product update.

---

## Acceptance Criteria

Acceptable when:
- homepage looks like a Vietnamese local brand shop
- product listing works
- active products with stock appear on `/products`
- products with active variant stock appear even if product stock was stale
- product detail works
- cart works
- checkout works with COD and Bank Transfer
- orders are saved
- admin can view orders
- admin can create/update products
- admin can manage variants/stock if schema supports it
- admin can understand why a product is not visible
- admin dashboard is TailAdmin-inspired
- account menu is at top-right
- each admin can choose Vietnamese or English independently
- admin can edit homepage slogan/banner/hero content
- mobile UI is clean
- `.env.example` is updated
- app runs locally without Stripe
- no obvious TypeScript/build errors

---

## Final Notes

Focus on:
- product visibility
- admin product update
- correct Supabase/RLS behavior
- practical admin dashboard
- homepage customization from admin
- beautiful but simple UI
- cart
- checkout
- orders
- clean README when needed

Do not spend time on:
- Stripe
- Momo
- VNPay
- complex auth
- complex warehouse logic
- full CMS rewrite
- Medusa migration
- overdesigned admin panels
