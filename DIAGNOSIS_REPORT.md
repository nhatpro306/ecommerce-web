# Diagnosis Report — Admin Dashboard + Add Cart Failures

Date: 2026-05-25
Branch: `feat/phase-2-admin-dashboard`
Site: resey.uk

---

## 1. Root cause chính

**Hai function `is_admin` cùng tồn tại nhưng chỉ một được GRANT EXECUTE.**

| Function | Schema | Defined in | SECURITY DEFINER | Grants |
|---|---|---|---|---|
| `public.is_admin()` (no arg) | `public` | `supabase/migrations/20260525_fix_rls_cart_isadmin.sql:19` | ✅ Yes | ✅ anon, authenticated, service_role |
| `public.is_admin(check_user_id uuid)` | `public` | `supabase/resey_base_schema.sql:18` | ? (need verify on prod) | ? |
| **`private.is_admin(user_id uuid)`** | **`private`** | `supabase/migrations/20260524090000_add_product_sale_price_variants_images.sql:28-58` | ❌ **No** | ❌ **No grant. No `USAGE` on `private` schema.** |

RLS policies trên các bảng `products`, `categories`, `store_settings`, `product_images`, `product_variants` đều gọi `private.is_admin((select auth.uid()))` (xem `20260525113000_admin_perf_rls_and_indexes.sql:76-165`).

Khi role `authenticated` hoặc `anon` query các bảng trên:
1. RLS engine evaluate policy expression
2. Expression call `private.is_admin(uuid)`
3. Role thiếu `USAGE` trên schema `private` + thiếu `EXECUTE` trên function
4. PostgreSQL trả `42501 permission denied for function is_admin`
5. PostgREST map sang HTTP 403

→ **Đây là smoking gun của `permission denied for function is_admin`.**

---

## 2. Vì sao Admin Dashboard không xem được

Flow:

1. Browser → `GET /admin` → Next.js SSR
2. `src/app/admin/layout.tsx:10` → `requireAdmin()`
3. `src/lib/auth/requireAdmin.ts:9-32` → `createServerSupabase()` (SSR cookies), `auth.getUser()`, sau đó:
   ```ts
   supabase.from("profiles").select("role, is_active").eq("profile_id", user.id).single()
   ```
4. Query này KHÔNG gọi `is_admin()` → bản thân admin guard ok.
5. Nhưng dashboard render xong, client component (`AdminDashboardClient`, `/admin/products`) fetch data qua **client supabase** (anon role).
6. `adminProductService.getAllProducts` (line 50-132) join `product_images`, `product_variants`, `categories` → mỗi join trigger policy gọi `private.is_admin(uuid)` → 403 trên cả collection.
7. Toast "Không thể tải sản phẩm" + loading spinner mãi.

**Đường thứ hai (slow):** admin products fetch ALL rows một lần, không paginate ở DB. Pagination chỉ làm ở client (`page.tsx:290-299`). Khi product table > vài trăm dòng, query chậm + RLS phải evaluate cho mỗi row.

---

## 3. Vì sao không add sản phẩm vào giỏ hàng

Flow add cart từ browser:

1. User nhấn "Thêm vào giỏ" → `addItemToCart` (`cartService.ts:138`).
2. Trước đó cần `getOrCreateCart` → `getActiveCart` (`cartService.ts:24`).
3. `getActiveCart` query:
   ```ts
   supabase.from('carts').select('*').eq('user_id', user.id).eq('status', 'active')
   ```
4. RLS policy hiện tại trên `carts` (theo `20260525_fix_rls_cart_isadmin.sql`):
   - `carts_select_own` — `user_id = auth.uid()` ✅ OK
   - `carts_admin_read_all` — `public.is_admin()` ✅ granted
5. **NHƯNG**: nếu migration `20260525_fix_rls_cart_isadmin.sql` CHƯA chạy trên production DB, policy cũ vẫn còn — chính sách cũ có thể gọi `is_admin()` không grant → 403 GET /carts.

Console log đã trích:
```
GET .../carts?... 403 Forbidden
Error fetching cart:
{ code: "42501", message: "permission denied for function is_admin" }
```

Khớp 100% với root cause #1.

---

## 4. Vấn đề Supabase / RLS

### Function definitions hiện tại

```sql
-- public.is_admin()  (no arg)  -- correct
create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public, auth
as $$ select exists (select 1 from public.admin_users au where au.user_id = auth.uid()) $$;

grant execute on function public.is_admin() to anon, authenticated, service_role;
```

```sql
-- private.is_admin(uuid)  -- BROKEN: not SECURITY DEFINER, not granted
create function private.is_admin(user_id uuid)
returns boolean language sql stable
as $$ select public.is_admin(user_id) $$;
-- (no grant, no SECURITY DEFINER, schema "private" lacks USAGE for app roles)
```

### Policies gọi is_admin

- `products`: `products_read_active`, `products_admin_insert|update|delete` → `private.is_admin`
- `categories`: 4 policies → `private.is_admin`
- `store_settings`: 4 policies → `private.is_admin`
- `product_images`: 4 policies → `private.is_admin`
- `product_variants`: 4 policies → `private.is_admin`
- `carts` (sau fix): `carts_admin_read_all` → `public.is_admin()` (ok)

### Hai branch riêng biệt cùng tồn tại

- `public.is_admin()` (no arg) dùng cho carts.
- `private.is_admin(uuid)` dùng cho catalog tables.
- Cùng kiểm tra `admin_users.user_id = auth.uid()` nhưng đường thứ hai bị thiếu quyền.

### admin_users vs profiles.role mismatch

- `requireAdmin()` đọc `profiles.role = 'admin'`.
- `public.is_admin()` đọc `admin_users.user_id = auth.uid()`.
- Nếu admin chỉ được set role trong `profiles` mà chưa insert vào `admin_users` → `is_admin()` trả false → admin RLS bypass không hoạt động (admin vẫn được vì là server action có service-equivalent path, nhưng tất cả client read fails).

---

## 5. Vấn đề performance / database

### Indexes đã có (từ migrations)
- `idx_carts_user_status (user_id, status)` ✅
- `idx_cart_items_cart_id` ✅
- `idx_cart_items_product_id` ✅
- `idx_product_images_product_id` ✅
- `idx_products_created_at`, `idx_products_is_active`, `idx_products_category_id` ✅
- `idx_orders_created_at`, `idx_orders_status`, `idx_orders_shipping_address_id` ✅
- `idx_categories_parent_id` ✅

### Indexes còn thiếu

| Index | Bảng | Cột | Lý do |
|---|---|---|---|
| `idx_products_slug` | `products` | `slug` (unique) | Product detail page query `.eq('slug', slug)` — hot path |
| `idx_product_variants_product_id` | `product_variants` | `product_id` | Join trong adminProductService + product detail |
| `idx_reviews_product_id` | `reviews` | `product_id` | `getReviewStatsByProduct` dùng `.in('product_id', [...])` |
| `idx_order_items_order_id` | `order_items` | `order_id` | Join admin orders FK |
| `idx_order_items_product_id` | `order_items` | `product_id` | Join product snapshot |
| `idx_admin_users_user_id` | `admin_users` | `user_id` | `is_admin()` lookup mỗi RLS check |
| `idx_profiles_role` | `profiles` | `(role)` filter `= 'admin'` | Optional; `requireAdmin` |
| `idx_orders_user_id` | `orders` | `user_id` | User order history |

### Query chậm / N+1

- `adminProductService.getAllProducts` — fetch tất cả rows, KHÔNG paginate ở DB. Pagination chỉ ở client (page.tsx:290).
- Sau khi fetch products, gọi `getReviewStatsByProduct` cho TẤT CẢ product_ids — separate query, tốn time.
- `getProductAnalytics` chạy 4 query liên tiếp + fetch toàn bộ `price, stock` để compute totalInventoryValue ở JS.
- Cart `getCartItems` join `product:products(*)` lấy toàn bộ cột product.

### RLS performance hits
- `private.is_admin(uuid)` được call cho MỖI row khi RLS evaluate (without init-plan rewrite — `(select private.is_admin(...))`).
- `20260525113000` đã làm trick `(select auth.uid())` cho auth calls nhưng KHÔNG wrap is_admin() trong subselect → mỗi row vẫn re-evaluate.

---

## 6. Danh sách fix cần làm

### Critical fix (deploy ngay, fix lỗi 403)

1. **Grant `private.is_admin`** + USAGE schema `private` cho `authenticated, anon`.
2. **Make `private.is_admin` SECURITY DEFINER** + `set search_path = public, auth`.
3. **Wrap call `private.is_admin(...)` trong `(select ...)`** ở RLS policies để Postgres cache result mỗi statement (init-plan rewrite).
4. **Verify migration `20260525_fix_rls_cart_isadmin.sql` đã chạy** trên production Supabase.
5. **Verify admin user có row trong `admin_users` table** (`auth.uid()` của admin).

### Safe improvement

6. Force `private.is_admin` chỉ là alias `public.is_admin()` — single source of truth.
7. Cart service: stop catching toast và silent return null trong `getActiveCart` — log `error.code` + `error.message` cụ thể.
8. Client-side cart fetch: check session trước khi gọi RLS-protected query, nếu chưa login → skip query.
9. `requireAdmin` đồng bộ với `is_admin()`: cùng nguồn (`admin_users` hoặc `profiles.role`).

### Performance optimization

10. Add `idx_products_slug` (unique), `idx_product_variants_product_id`, `idx_reviews_product_id`, `idx_order_items_order_id`, `idx_order_items_product_id`, `idx_admin_users_user_id`, `idx_orders_user_id`.
11. Pagination server-side cho `adminProductService.getAllProducts` (range + count exact).
12. Drop `description` khỏi admin products list SELECT (chỉ cần ở detail / edit modal).
13. Replace `select('*')` ở `cart_items.product:products(*)` bằng cột cần (product_id, title, slug, image, price, sale_price, is_active, stock).
14. `getReviewStatsByProduct` → tạo view/RPC `product_review_stats(product_id, total, avg)` để skip transfer raw ratings.

### Things NOT to change

- Không disable RLS bất kỳ bảng nào.
- Không expose `service_role` ra browser.
- Không hardcode admin email trong code.
- Không sửa UI / layout admin page trong task này.
- Không drop / truncate bảng nào.
- Không revert migration đã chạy.

---

## 7. Migration patch đề xuất

File mới: `supabase/migrations/20260526000000_fix_private_is_admin_and_indexes.sql`

```sql
-- =============================================================
-- 2026-05-26  Fix private.is_admin permission denied + perf
-- =============================================================

-- 1) Grant USAGE on private schema
grant usage on schema private to anon, authenticated;

-- 2) Rebuild private.is_admin as SECURITY DEFINER + safe search_path
create or replace function private.is_admin(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.admin_users where admin_users.user_id = $1
  );
$$;

grant execute on function private.is_admin(uuid) to anon, authenticated, service_role;

-- 3) Make sure public.is_admin() also aligned (no-op if already correct)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.admin_users where admin_users.user_id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to anon, authenticated, service_role;

-- 4) Missing performance indexes
create unique index if not exists idx_products_slug
  on public.products(slug) where slug is not null;

create index if not exists idx_product_variants_product_id
  on public.product_variants(product_id);

create index if not exists idx_reviews_product_id
  on public.reviews(product_id);

create index if not exists idx_order_items_order_id
  on public.order_items(order_id);

create index if not exists idx_order_items_product_id
  on public.order_items(product_id);

create index if not exists idx_admin_users_user_id
  on public.admin_users(user_id);

create index if not exists idx_orders_user_id
  on public.orders(user_id);

-- 5) Safety check — list rows in admin_users for verification only.
-- Run manually:
--   select au.user_id, u.email
--   from public.admin_users au
--   join auth.users u on u.id = au.user_id;
```

---

## 8. Verification Checklist

Trước khi sửa code:
- [ ] Apply migration `20260526000000_fix_private_is_admin_and_indexes.sql` lên Supabase
- [ ] Verify `select private.is_admin('00000000-0000-0000-0000-000000000000');` chạy được dưới role `authenticated`
- [ ] Verify admin user xuất hiện trong `admin_users`

Sau khi sửa code:
- [ ] Login user thường → vào `/products` → load OK
- [ ] Add product to cart → no 403
- [ ] View `/cart` → list items hiển thị
- [ ] Login admin → `/admin` load
- [ ] `/admin/products` load list, badge status đúng
- [ ] `/admin/orders` load orders
- [ ] Console DevTools: không còn 403 nào
- [ ] Supabase Dashboard → Logs → API: không còn `permission denied for function is_admin`
- [ ] Network tab: thời gian load `/admin/products` < 2s với 100 sản phẩm

---

## 9. Risks

- Nếu admin schema thực tế dùng `profiles.role = 'admin'` thay vì `admin_users` table → `is_admin()` body cần đổi sang `select role = 'admin' from profiles where profile_id = auth.uid()`. Cần verify schema thực trước khi apply.
- `idx_products_slug` UNIQUE sẽ FAIL nếu hiện tại có 2 dòng slug trùng. Cần `select slug, count(*) from products where slug is not null group by 1 having count(*) > 1;` trước.
- `SECURITY DEFINER` function chạy với quyền owner — phải đảm bảo function body không inject hoặc cho phép user thường escalate. Body chỉ là `exists(select ... where user_id = $1)` → safe.
- Migration chạy ngược order (`20260525_fix_rls_cart_isadmin.sql` không có timestamp đầy đủ) — Supabase migration sort theo string, `20260525113000` < `20260525_fix...` (do `1` < `_`). Tức là `113000` chạy TRƯỚC, `_fix` chạy SAU. OK, fix override đúng. Nhưng migration mới đề xuất phải có timestamp ĐẦY ĐỦ để chạy LAST.

---

## 10. Next steps khuyến nghị

1. Tôi sẽ chờ user confirm:
   - admin storage là `admin_users` hay `profiles.role = 'admin'`?
   - Migration `20260525_fix_rls_cart_isadmin.sql` đã chạy trên prod chưa?
2. Sau confirm → tôi tạo migration + tinh chỉnh `requireAdmin` + tinh chỉnh `adminProductService.getAllProducts` (pagination).
3. KHÔNG sửa UI.
