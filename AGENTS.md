# AGENTS.md

## Role

You are an AI coding agent working inside this repository.

Your job is to turn this cloned e-commerce repository into a modern Vietnamese local brand clothing website.

Do not rebuild everything from scratch. Reuse the existing code, architecture, components, database logic, cart logic, checkout logic, and admin logic as much as possible.

---

## Project Goal

Build a modern, mobile-first e-commerce website for a Vietnamese local brand / streetwear clothing shop.

The website should be good enough for:
- A real MVP shop
- A university portfolio project
- Job hunting portfolio
- Demonstrating frontend, backend, database, admin, checkout, and deployment skills

The final website should feel like a premium Vietnamese streetwear local brand.

---

## Base Repository Strategy

This project is cloned from an existing GitHub e-commerce source.

Before coding:
1. Inspect the current repository structure.
2. Identify the framework, packages, database, UI system, cart system, checkout system, and admin system.
3. Compare the current repo with this AGENTS.md.
4. Create a checklist of what already exists and what needs to be changed.
5. Reuse existing working code first.
6. Only add new code when necessary.

Do not delete useful existing functionality unless it conflicts with the MVP goal.

---

## Recommended Tech Stack

Use the existing stack if already present.

Preferred stack:
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- lucide-react
- Zustand or existing cart state management
- React Hook Form
- Zod
- Supabase PostgreSQL
- Supabase Storage or Cloudinary
- Vercel deployment

Do not add unnecessary heavy dependencies.

---

## Brand Direction

Turn the website into a Vietnamese local brand clothing store.

Style:
- Vietnamese streetwear
- Clean local brand identity
- Premium but simple
- Gen Z friendly
- Mobile-first
- Black / white / gray / beige color palette

Example brand names:
- RESEY
- VN STREET CLUB
- MINH LOCAL
- URBAN SAIGON
- LOCAL 84

Use one simple brand name consistently.

Recommended brand name:
RESEY

Tone:
- Minimal
- Confident
- Fashion-focused
- Youthful
- Modern

Example copy:
- "RESEY Modern Streetwear"
- "Made for everyday confidence"
- "New Drop"
- "Limited Collection"
- "RESEY identity, modern streetwear"
- "Designed for movement, built for daily wear"

---

## Payment Strategy

For MVP, do not implement real online payment.

Supported payment methods:
1. COD
2. Bank Transfer

If the original repo has Stripe:
- Keep the code only if it does not break the app.
- Hide Stripe from the main checkout UI.
- Do not make Stripe the default payment method.
- Do not require Stripe keys to run the app.

Checkout flow:
1. Customer adds products to cart.
2. Customer opens checkout.
3. Customer enters name, phone, email optional, address, note.
4. Customer chooses COD or Bank Transfer.
5. App creates order in database.
6. App creates order items.
7. App reduces stock if inventory exists.
8. App shows success page.
9. If Bank Transfer is selected, show bank information and transfer note.

Bank transfer information should be easy to edit in one config file.

Example:
- Bank name: Vietcombank
- Account name: RESEY
- Account number: 0123456789
- Transfer note: ORDER-{orderId}

Future payment gateways:
- VNPay
- Momo
- ZaloPay
- Stripe demo

Do not implement VNPay or Momo in MVP unless explicitly requested later.

---

## Required Pages

### 1. Homepage `/`

Must include:
- Navbar
- Hero section
- Featured products
- New drop section
- Category section
- Brand story
- Footer

Hero section:
- Big title
- Short subtitle
- CTA buttons:
  - Shop New Drop
  - View Collection
- Large fashion image or placeholder

---

### 2. Products `/products`

Must include:
- Product grid
- Search by name
- Filter by category
- Filter by size if possible
- Filter by color if possible
- Sort by latest
- Sort by price low to high
- Sort by price high to low
- Loading state
- Empty state
- Error state

Categories:
- T-Shirts
- Hoodies
- Pants
- Accessories

---

### 3. Product Detail `/products/[slug]`

Must include:
- Image gallery
- Product name
- Price
- Description
- Material
- Size selector
- Color selector
- Quantity selector
- Stock status
- Add to cart button
- Size chart
- Related products if possible

Validation:
- Do not allow add to cart without selecting required options.
- Do not allow quantity greater than stock if stock exists.
- Show toast after adding to cart.

---

### 4. Cart `/cart`

Must include:
- Cart items
- Product image
- Product name
- Size
- Color
- Quantity
- Price
- Remove item
- Update quantity
- Subtotal
- Checkout button
- Empty cart state

Cart should persist in localStorage if the existing architecture supports it.

---

### 5. Checkout `/checkout`

Must include:
- Customer name
- Phone number
- Email optional
- Address
- Note optional
- Payment method:
  - COD
  - Bank Transfer

Validation:
- Cart cannot be empty.
- Customer name is required.
- Phone is required.
- Address is required.

After successful order:
- Clear cart.
- Show order success page or success message.
- Show bank transfer information if selected.

---

### 6. Admin Dashboard `/admin`

Must include:
- Total products
- Total orders
- Pending orders
- Total revenue if possible

If the original repo already has admin features, improve them instead of rebuilding.

---

### 7. Admin Products

Must include:
- Product table
- Create product
- Edit product
- Deactivate product instead of hard delete if possible
- Manage category
- Manage price
- Manage images
- Manage variants / stock if existing schema supports it

---

### 8. Admin Orders

Must include:
- Order list
- Customer information
- Order items
- Total amount
- Payment method
- Status update

Order statuses:
- pending
- confirmed
- shipping
- completed
- cancelled

---

## Product Data

Replace generic demo products with local brand clothing products.

Seed/sample products:
1. RESEY Oversized Tee
2. RESEY Minimal Hoodie
3. RESEY Street Cargo Pants
4. RESEY Logo Cap
5. RESEY Heavyweight Tee
6. RESEY Dragon Graphic Tee
7. RESEY Boxy Tee
8. RESEY Club Hoodie

Each product should include:
- Name
- Slug
- Price in VND
- Category
- Description
- Material
- Sizes: S, M, L, XL
- Colors: Black, White, Gray
- Stock
- Image placeholder

---

## UI Requirements

Use clean, reusable components.

Required UI behavior:
- Responsive navbar
- Mobile menu
- Product cards
- Loading skeletons
- Empty states
- Error states
- Toast notifications
- Consistent spacing
- Clean typography
- Good mobile layout
- No horizontal overflow on mobile

Price format:
- Use Vietnamese Dong
- Example: 450000 -> 450.000₫

---

## Code Quality Rules

Important:
- Do not hardcode main business logic.
- Do not expose API keys.
- Do not commit real `.env` files.
- Keep `.env.example`.
- Keep components reusable.
- Use TypeScript properly.
- Handle loading, empty, and error states.
- Avoid changing unrelated files.
- Avoid over-engineering.
- Keep the MVP simple and working.
- Prefer small safe changes.
- Run lint/build/typecheck when possible.

Before each major code change:
- Explain the plan briefly.

After each major code change:
- Explain changed files.
- Explain how to test.
- Mention remaining TODOs.

---

## Environment Variables

Make sure `.env.example` exists.

Recommended:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=

NEXT_PUBLIC_BANK_NAME=
NEXT_PUBLIC_BANK_ACCOUNT_NAME=
NEXT_PUBLIC_BANK_ACCOUNT_NUMBER=
```

Do not require Stripe keys for the MVP.

---

## README Requirements

Update README.md.

README should include:
- Project overview
- Features
- Tech stack
- Screenshots placeholder
- Folder structure
- Environment variables
- Database setup
- How to run locally
- How to deploy to Vercel
- Payment strategy
- Future improvements

Writing style:
- Simple English
- Professional
- Like a 4th-year university student portfolio project

---

## Development Order

Follow this order:

1. Inspect repo
2. Create checklist
3. Update branding
4. Update homepage
5. Update product data/categories
6. Improve product listing
7. Improve product detail
8. Improve cart
9. Change checkout to COD + Bank Transfer
10. Improve order creation
11. Improve admin dashboard
12. Improve admin products
13. Improve admin orders
14. Add seed/sample data
15. Update README
16. Final UI polish
17. Run final test

---

## Acceptance Criteria

The project is done when:

- Homepage looks like a Vietnamese local brand shop.
- Product listing works.
- Product detail works.
- Cart works.
- Checkout works with COD and Bank Transfer.
- Orders are saved.
- Admin can view orders.
- Admin can manage products if the repo supports it.
- Mobile UI is clean.
- README is updated.
- `.env.example` is updated.
- App can run locally without Stripe.
- No obvious TypeScript or build errors.

---

## Final Notes

This project should prioritize working MVP over complex features.

Do not spend too much time on:
- Stripe
- Momo
- VNPay
- Complex auth
- Complex warehouse logic
- Overdesigned admin panels

Focus on:
- Beautiful UI
- Product browsing
- Cart
- Simple checkout
- Orders
- Admin basics
- Clean README
