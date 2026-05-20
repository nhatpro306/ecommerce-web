# Resey — Vietnamese Streetwear E-Commerce Platform

A modern full-stack Vietnamese streetwear e-commerce platform built with Next.js, Supabase, and Tailwind CSS.

Resey was developed by extending and redesigning an existing e-commerce codebase into a portfolio-ready local fashion brand platform focused on mobile-first UX, scalable architecture, and production deployment.

The project demonstrates a real-world modern commerce workflow including:

* Product discovery
* Variant selection
* Cart persistence
* COD & bank-transfer checkout
* Order storage
* Admin functionality
* SEO optimization
* Production deployment with Vercel

---

# ✨ Features

## 🏠 Storefront

* Vietnamese local brand landing page
* Mobile-first responsive design
* Featured collections and categories
* Optimized user experience for fashion/streetwear

---

## 🛍 Product System

* Product search
* Category filtering
* Size filtering
* Color filtering
* In-stock filtering
* Product sorting
* URL-based query state

### Product Detail Page

Dynamic slug routing:

```bash
/products/[slug]
```

Includes:

* Product gallery
* Size selection
* Color selection
* Quantity selector
* Material information
* Stock status
* Related products
* Toast notifications
* Responsive mobile layout

---

## 🛒 Shopping Cart

* Persistent cart state
* Variant-aware cart items
* Selected size/color saved
* Quantity editing
* Real-time subtotal updates

---

## 💳 Checkout System

### Supported Payment Methods

* Cash on Delivery (COD)
* Bank Transfer

### Checkout Information

* Customer name
* Phone number
* Email
* Address
* Order note
* Payment method

### Order Handling

* Stores variant metadata
* Best-effort inventory reduction
* Bank transfer instruction page
* Unique order code:

```bash
ORDER-{orderId}
```

---

## 🔐 Admin Features

Admin pages from the original repository were preserved and incrementally improved.

Includes:

* Product management basics
* Order viewing
* Inventory overview foundation
* Authentication integration

---

## 🔍 SEO Optimization

* Dynamic metadata
* OpenGraph support
* robots.txt
* sitemap.xml
* Search-engine friendly routes
* Clean URL structure

---

# 🧱 Tech Stack

| Technology         | Purpose                      |
| ------------------ | ---------------------------- |
| Next.js App Router | Frontend + Server Components |
| TypeScript         | Type safety                  |
| Tailwind CSS       | Styling                      |
| shadcn/ui          | UI components                |
| Supabase           | Database + Auth              |
| PostgreSQL         | Data storage                 |
| TanStack Query     | Async state management       |
| Sonner             | Toast notifications          |
| Vercel             | Deployment                   |

---

# 📂 Project Structure

```bash
src/
├── app/                 # App Router pages & API routes
├── components/          # Shared UI components
├── context/             # Auth & cart providers
├── hooks/               # TanStack Query hooks
├── lib/supabase/        # Supabase helpers
├── services/            # Business logic & DB services
└── styles/              # Global styling

supabase/
└── migrations/          # SQL migrations & seed data
```

---

# ⚙️ Environment Variables

Create `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_SITE_URL=http://localhost:3000

NEXT_PUBLIC_BANK_NAME=Vietcombank
NEXT_PUBLIC_BANK_ACCOUNT_NAME=Resey
NEXT_PUBLIC_BANK_ACCOUNT_NUMBER=0123456789
```

> Never commit real secrets to GitHub.
> Use `.env.example` as the public template.

---

# 🗄 Database Setup

## 1. Create Supabase Project

Create a new project in Supabase.

---

## 2. Apply Base Schema

Run the original repository schema first.

---

## 3. Run Migrations

Apply migrations in order:

```bash
20260520_add_product_is_active_and_seed_local_brand.sql

20260520_z_add_clothing_variant_checkout_fields.sql
```

---

## Current Migration Features

### Product Fields

* `products.is_active`
* `products.slug`
* `products.material`
* `products.sizes`
* `products.colors`

### Cart Fields

* `cart_items.selected_size`
* `cart_items.selected_color`
* `cart_items.variant_info`

### Order Fields

* `order_items.selected_size`
* `order_items.selected_color`
* `order_items.variant_info`

### Customer Checkout Fields

* `orders.customer_name`
* `orders.customer_phone`
* `orders.customer_email`
* `orders.customer_note`

### Seed Data

* Vietnamese local brand products
* Categories
* Sample inventory

---

# 🚀 Local Development

Install dependencies:

```bash
npm install --legacy-peer-deps
```

Start development server:

```bash
npm run dev
```

Open:

```bash
http://localhost:3000
```

---

# ✅ Quality Checks

Run before deployment:

```bash
npm run lint
npm run build
```

Both commands should pass successfully.

---

# 💰 Payment Strategy

This MVP intentionally focuses on lightweight payment methods for rapid deployment and demonstration.

## Included

* COD
* Bank Transfer

## Planned Future Integrations

* VNPay
* Momo
* ZaloPay
* Stripe

Legacy Stripe/Polar logic from the original repository remains only for compatibility purposes.

---

# 🌐 Deployment

## Deploy with Vercel

1. Push repository to GitHub
2. Import repository into Vercel
3. Add environment variables
4. Deploy project
5. Set:

```env
NEXT_PUBLIC_SITE_URL=https://your-production-url.vercel.app
```

6. Connect production Supabase project

---

## Production Architecture

```bash
GitHub
   ↓
Vercel
   ↓
Supabase
```

---

# 📸 Screenshots

Add production screenshots here after deployment:

* Homepage
* Products page
* Product detail
* Cart
* Checkout
* Admin dashboard

---

# 🛣 Future Improvements

## Commerce

* True variant-level inventory
* Advanced product editor
* Discount system
* Wishlist
* Order tracking

## Infrastructure

* Cloudinary / Supabase Storage uploads
* Email notifications
* Analytics dashboard
* Background jobs

## SEO & Performance

* Product structured data
* Dynamic OG images
* Advanced caching
* Search optimization

---

# 🎯 Project Goals

This project was built to demonstrate:

* Modern full-stack web development
* E-commerce architecture
* Production deployment workflow
* Database design
* State management
* Responsive UI/UX
* Real-world portfolio quality engineering

---

# 📄 License

This project is intended for educational and portfolio purposes.
