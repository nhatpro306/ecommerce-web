# CLAUDE.md

## 1. Project Overview

This project is **RESEY**, a real Vietnamese local brand / streetwear e-commerce website.

This is not a demo project. The goal is to make the website usable for selling real clothes, managing products, receiving orders, and maintaining the project safely.

The project should be treated as a real production e-commerce system.

## 2. Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase
- Vercel
- Vietnamese UI
- Mobile-first design

## 3. Business Context

RESEY is a Vietnamese local brand / streetwear clothing shop.

The website must support real selling flow:

- Customers can browse products.
- Customers can view product details.
- Customers can choose size/color.
- Customers can add products to cart.
- Customers can checkout.
- Orders must be saved correctly.
- Admin can manage products.
- Admin can view orders.

The admin user may be non-technical, so admin pages must be simple, clear, and easy to use.

## 4. Current Main Problems

The most important current issues are:

1. `/admin/orders` shows `Không thể tải đơn hàng`.
2. Products uploaded from admin exist but do not appear correctly on the storefront.
3. `/admin/products` is too difficult for a non-technical seller to use.
4. Product creation/editing needs better Vietnamese UI.
5. Product data, order data, Supabase schema, and frontend logic may be inconsistent.

Fix real bugs before improving visual design.

## 5. Main Priorities

Work in this order:

1. Fix production bugs.
2. Fix Supabase product/order data flow.
3. Make admin product management usable.
4. Improve storefront user experience.
5. Improve mobile UI.
6. Refactor only when necessary.

Do not redesign the website before the product/order system works correctly.

## 6. General Rules

Before editing files:

1. Read relevant files first.
2. Understand the current project structure.
3. Find the real root cause.
4. Do not guess.
5. Do not invent Supabase table names.
6. Do not invent Supabase column names.
7. Do not rewrite the whole project.
8. Do not delete working features.
9. Do not make large unrelated changes.
10. Do not change authentication/security logic without explaining why.
11. Do not hardcode fake production data.
12. Do not expose secrets or environment variables.

Make minimal safe changes.

## 7. Required Workflow

For every task, follow this workflow:

1. Inspect relevant files.
2. Identify the root cause.
3. Explain the fix plan shortly.
4. Make minimal changes.
5. Run checks if possible:
   - `npm run lint`
   - `npm run build`
6. Report clearly:
   - Files changed
   - What was fixed
   - Why it was fixed
   - How to test manually
   - Any remaining risks

Do not claim the project works unless checks pass or explain why checks could not be run.

## 8. Supabase Rules

Supabase is the source of truth.

Before changing product or order logic:

1. Check the actual Supabase query.
2. Check the real table names.
3. Check the real column names.
4. Check frontend assumptions.
5. Check whether RLS may block data.
6. Check whether the admin page uses the correct client.
7. Check whether relationships/foreign keys are valid.
8. Never expose service role keys to the browser.

Do not invent fields such as:

- `is_active`
- `visible`
- `image`
- `image_url`
- `status`
- `slug`
- `category_id`

unless they already exist or a migration is intentionally added.

If a database migration is needed, explain:

- Why it is needed
- Which table is affected
- Which columns are added or changed
- Whether existing data may break
- How to verify after running it

## 9. Product Rules

Products must work consistently across:

- Admin product creation
- Admin product editing
- Product listing page
- Product detail page
- Cart
- Checkout
- Order items

A product created in admin must appear on the storefront when it is intended to be visible.

Check for mismatches such as:

- `id` vs `product_id`
- `image` vs `image_url`
- `category` vs `category_id`
- `price` as string vs number
- `sizes` as string vs array
- `colors` as string vs array
- missing `slug`
- draft/hidden status
- stock logic hiding products
- client-side filters hiding products
- RLS blocking select/insert/update

Product data should support clothing-specific information:

- Product name
- Slug
- Description
- Price
- Sale price
- Category
- Sizes
- Colors
- Stock
- Images
- Status / visibility
- Featured product
- Created date
- Updated date

## 10. Order Rules

Orders must load correctly in admin.

When fixing `/admin/orders`, check:

- Order table name
- Order items table name
- Supabase select query
- Relationship syntax
- Foreign keys
- RLS policy
- Status field
- Date sorting
- Error handling
- Whether UI expects nested product data
- Whether customer fields exist

The admin order page should clearly display:

- Order ID
- Customer name
- Phone number
- Email
- Address
- Note
- Product items
- Selected size
- Selected color
- Quantity
- Total price
- Payment method
- Order status
- Created date

## 11. Admin UX Rules

Admin pages are for non-technical sellers.

Use simple and natural Vietnamese.

Good labels:

- Tên sản phẩm
- Giá bán
- Giá khuyến mãi
- Danh mục
- Mô tả sản phẩm
- Kích cỡ
- Màu sắc
- Số lượng tồn kho
- Ảnh sản phẩm
- Trạng thái hiển thị
- Sản phẩm nổi bật
- Lưu sản phẩm
- Cập nhật sản phẩm
- Xóa sản phẩm

Avoid technical wording unless necessary.

Admin product UI should include:

- Large readable input fields
- Clear required fields
- Image preview
- Helpful placeholder text
- Easy size input
- Easy color input
- Clear stock field
- Clear price field
- Clear sale price field
- Save button
- Loading state
- Success message
- Error message
- Product table/list
- Edit button
- Delete button
- Visibility/status control

## 12. Storefront UX Rules

The storefront should feel like a real Vietnamese streetwear shop.

Design direction:

- Clean
- Modern
- Streetwear
- Mobile-first
- Strong product images
- Clear prices
- Easy product discovery
- Fast checkout
- Vietnamese wording
- Not too corporate
- Not too childish

Product cards should show:

- Product image
- Product name
- Price
- Sale price if available
- Category
- Stock/availability if useful
- Link to detail page

Product detail page should show:

- Image gallery
- Product name
- Price
- Sale price
- Description
- Size selector
- Color selector
- Quantity selector
- Add to cart button
- Stock status
- Related products if available

## 13. Vietnamese UI Rules

Use clean Vietnamese.

Avoid broken encoding.

Bad examples:

- S?n ph?m
- Gi? b?n
- Kh?ng th? t?i

Good examples:

- Sản phẩm
- Giá bán
- Không thể tải dữ liệu

Tone should be friendly and professional.

For RESEY, the storefront can feel cool and streetwear, but admin forms should stay clear and easy to understand.

## 14. Code Quality Rules

Use TypeScript safely.

Prefer:

- Clear types
- Small helper functions
- Existing utilities
- Existing components
- Simple readable logic

Avoid:

- `any` unless necessary
- Huge files
- Duplicated Supabase logic
- Overengineering
- Random new libraries
- Rewriting working pages
- Changing unrelated files

## 15. Styling Rules

Use Tailwind CSS consistently.

For admin pages:

- Clear layout
- Good spacing
- Large clickable buttons
- Readable table/list
- Mobile responsive
- Simple form sections
- Clear error states
- Clear success states

For storefront pages:

- Mobile-first
- Product images first
- Strong visual hierarchy
- Clear CTA buttons
- Good loading skeletons
- Empty states
- Error states

## 16. Testing Checklist

After changes, test these routes manually:

- `/`
- `/products`
- `/products/[slug]`
- `/cart`
- `/checkout`
- `/admin`
- `/admin/products`
- `/admin/orders`

Important test flows:

1. Create a product in admin.
2. Confirm the product appears on `/products`.
3. Open the product detail page.
4. Select size and color.
5. Add product to cart.
6. Checkout.
7. Confirm order is stored.
8. Confirm order appears in admin.
9. Update product.
10. Confirm updated data appears on storefront.

## 17. Commands

Use these commands when relevant:

```bash
npm install
npm run dev
npm run lint
npm run build
```

Do not claim checks passed unless they were actually run.

## 18. Git Rules

Before making large changes:

1. Check current branch.
2. Avoid mixing unrelated tasks.
3. Keep changes small.
4. Summarize changed files.

Do not commit automatically unless explicitly asked.

Suggested branch names:

```bash
fix/admin-orders-products
improve/admin-products-ui
improve/storefront-ux
```

## 19. Environment Rules

Do not edit or expose:

- `.env`
- `.env.local`
- `.env.production`
- Supabase service role key
- API secrets
- Vercel tokens

If environment variables are missing, explain which variable is needed without exposing values.

## 20. Phase Plan

### Phase 1: Fix Core Bugs

Goal:

Fix admin orders loading and product visibility.

Tasks:

- Inspect Supabase product/order queries.
- Fix `/admin/orders` loading error.
- Fix product upload visibility issue.
- Ensure admin-created products appear on storefront.
- Ensure errors are shown clearly in Vietnamese.
- Do not redesign UI in this phase.

### Phase 2: Improve Admin Product Management

Goal:

Make product management easy for a non-technical seller.

Tasks:

- Improve `/admin/products` form.
- Add image preview.
- Improve Vietnamese labels.
- Add clear validation.
- Improve size/color/stock input.
- Improve product table/list.
- Add edit/delete/status controls if missing.
- Keep schema changes minimal.

### Phase 3: Improve Storefront

Goal:

Make the shop feel real and ready to sell clothes.

Tasks:

- Improve product listing UI.
- Improve product detail page.
- Improve mobile layout.
- Improve loading/empty/error states.
- Improve Vietnamese wording.
- Make size/color selection clear.
- Make cart and checkout easier.

### Phase 4: Final Production Check

Goal:

Make the project safer to deploy and maintain.

Tasks:

- Run lint.
- Run build.
- Check broken links.
- Check mobile layout.
- Check Supabase data flow.
- Check Vercel environment assumptions.
- Summarize remaining risks.

## 21. Response Format

When completing a task, respond with:

```txt
Summary:
- ...

Files changed:
- ...

Root cause:
- ...

What I changed:
- ...

How to test:
1. ...
2. ...
3. ...

Checks:
- npm run lint: pass/fail/not run
- npm run build: pass/fail/not run

Notes / risks:
- ...
```

## 22. Important Reminder

This is a real e-commerce project for selling clothes.

Always protect:

- Product data
- Order data
- Customer information
- Admin usability
- Production stability

Do not make the project look better while breaking the buying flow.
