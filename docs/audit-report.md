# RESEY — Audit Report

- **Branch**: `feat/phase-2-admin-dashboard`
- **Repo HEAD**: `e767ac4 docs: add Phase 1 production audit report`
- **Live site**: https://resey.uk/
- **Audit date**: 2026-05-27
- **Phương pháp**: đọc code, đọc migrations, fetch live site (homepage, /products, /products/[slug], /signin) — **không sửa code, không chạy migration, không commit**.

---

## 1. Tổng kết nhanh

### Site đang ổn ở những điểm nào
- Trang chủ, /products, /products/[slug], /signin **load được**, không 404/500, UI Việt sạch (không lỗi encoding).
- Hero, navbar, footer, ProductCard, filter bar (search/sort/category/size/color/stock) đã hoạt động.
- Auth flow có signin / signup / reset-password / update-password đầy đủ; redirect `returnTo` đã bảo vệ chống open-redirect.
- Checkout có form đầy đủ: tên / SĐT (regex `^0\d{9}$`) / địa chỉ Việt Nam (province/district/ward dùng `@do-kevin/pc-vn`) / COD vs chuyển khoản / bank info kéo từ `store_settings`.
- Đặt hàng đi qua RPC `create_order_checkout` (atomic ở Postgres) thay vì client tự insert order_items → an toàn khi stock race.
- Admin shell:
  - Có `requireAdmin()` server-side (kiểm tra `profiles.role = 'admin'` và `is_active`) → page guard ở layout.
  - Tất cả write của admin (`createAdminProductAction`, `updateAdminProductAction`, `delete...`, `activate...`, `syncAdminProductVariantsAction`, `syncAdminProductImagesAction`) là **server actions** với `await requireAdmin()` đầu tiên.
  - Dashboard có KPI cards, danh sách đơn cần xử lý, sản phẩm cần chú ý (thiếu ảnh / chưa phân loại / hết hàng / test).
  - Admin product list có status tabs (Tất cả / Đang bán / Nháp / Cần sửa / Hết hàng / Tạm ẩn), pagination, search, sort.
- Service role key **không** xuất hiện trong code client/server source (đã grep) → tốt.
- RLS đã được dọn nhiều lần, hiện đại hoá sang `private.is_admin(auth.uid())`.
- Đã có migration biến `cart_items.variant_id` / `order_items.variant_id` từ `text` → `uuid` + FK.

### Vấn đề lớn nhất hiện tại
1. **Test data lọt lên production storefront**: 2 sản phẩm "a" (12.345 ₫) và "Abc" (450.000 ₫) đang hiển thị public trên https://resey.uk/products. Dashboard biết detect "test/demo/sample/mock/aaa/123" khi publish, nhưng không **lọc khỏi storefront sau khi đã publish**. → tác động trực tiếp ấn tượng thương hiệu.
2. **Hero subtitle có chữ "abc"** trên trang chủ (đến từ `store_settings.hero_subtitle`) — nội dung test chưa được sửa trong admin/settings.
3. **Schema docs ở `docs/schema.md` đã lỗi thời** (mô tả `products.image`, `category_id integer`, không nhắc `product_images`, `product_variants`, `sale_price`, `slug`). Người mới đọc dễ làm sai.
4. **Image upload bucket `product-images` có rủi ro RLS**: migration cuối (`20260526140000`, `20260526142000`) đã **DROP** các policy `product_images_storage_admin_insert/update/delete` trên `storage.objects` và **không re-create** dùng `private.is_admin`. Admin upload ảnh sản phẩm từ trình duyệt có thể bị RLS chặn khi production replay migrations từ đầu. (Nếu policies được tạo qua Supabase Dashboard thì hiện tại có thể ổn — nhưng repo không phản ánh nguồn sự thật.)
5. **`docs/architecture.md` mô tả "React + Vite + services/hooks"** trong khi code thực tế là Next.js App Router + server actions. Tài liệu chệch hoàn toàn với thực tế.
6. **`src/types/supabase.ts` chỉ là `export type Database = any`** → mất hoàn toàn type-safety của Supabase. Phần lớn services dùng cast `as` thay vì generic types.
7. **Browser-side admin reads (`adminProductService.getAllProducts`, `adminOrderService.getAllOrders`)** chạy với client session — phụ thuộc RLS `private.is_admin(...)`. Mới gần đây phải fix navigator.locks deadlock + clear stale cookies + timeout 12s. Architecture này khá fragile so với đặt mọi admin read sau server action.
8. **`adminOrderService.getOrderAnalytics`** quét full bảng `orders` (4 query `select total / status / user_id…` không có range). Khi shop lớn lên, dashboard sẽ chậm/timeout.
9. **`docs/api.md`, `docs/schema.md`, `docs/README.md`** vẫn nói "React + Vite + src/db" → drift nặng.
10. **Hardcoded fallback `0123456789` cho số tài khoản ngân hàng** trong `CheckoutClient.tsx` — nếu `store_settings` rỗng, khách thấy số fake.

### Có nên deploy tiếp không?
**Có — nhưng cần xóa test product + sửa subtitle "abc" trước.** Hệ thống auth/RLS/checkout core ổn để bán. Còn các vấn đề performance/maintainability có thể sửa dần ở Phase 2-5.

---

## 2. Chấm điểm thang 10

| Mục | Điểm | Lý do |
|---|---|---|
| UI/UX user site | **7.5/10** | Layout streetwear sạch, mobile-first, ngôn ngữ Việt chuẩn. Nhưng homepage hero còn text "abc"; storefront vẫn hiển thị product test "a", "Abc" — phá ấn tượng pro. Filter / search hoạt động tốt. |
| Admin dashboard | **7/10** | KPI cards, tabs, status badges, attention list — đầy đủ cho seller non-tech. Tuy nhiên: bảng products `min-w-[1240px]` phải scroll ngang trên màn 1366px; cột "Thao tác" sticky tạo 4 nút stack dọc khá hẹp; nhiều badge cùng lúc rối mắt; mobile card có 4 nút (Xem/Sửa/Ẩn/Xóa) chật. Orders page chưa có inline expand, phải mở modal. |
| Performance | **6/10** | Mọi storefront page hiện là RSC + Supabase fetch không cache (`createPublicServerSupabase` mỗi request). Chưa có `revalidate` hoặc tag-based ISR. Image vẫn dùng `dangerouslyAllowSVG` + `hostname: "**"` (rủi ro). Admin product list giới hạn 100 nhưng dashboard fetch 50 — chấp nhận được. `adminOrderService.getOrderAnalytics` scan toàn bảng → sẽ chậm khi nhiều đơn. |
| Code quality | **7/10** | Không thấy `: any` / `as any` trong `src/` (grep). `console.error` được dùng kèm context object → debug ổn. Tuy nhiên Database type là `any` → bỏ phí TS. ClientProducts.tsx duplicate filter mapping (Áo thun/Hoodie/...) cứng trong code. CartShoppingPage và CheckoutClient có vài chỗ trùng currency/format. |
| Supabase/backend | **6.5/10** | RLS đã chuyển sang `private.is_admin` (tốt). Migration đã fix variant_id uuid, init-plan, search_path. **Rủi ro**: storage.objects RLS bị drop không re-create; docs/schema.md lỗi thời; 19 file migration cuối tháng 5 dồn dập sửa lẫn nhau — khó replay từ đầu trên staging mới. Function `create_order_checkout` (RPC) tốt. |
| Security | **7.5/10** | Service role không bị import client/server source. `requireAdmin` chặt. Open-redirect protected. Input validate phone client-side. Storage bucket có size limit 5MB + MIME filter. **Rủi ro lịch sử**: commit `256aa4d` đã từng leak `.env.vercel` chứa service role — CODEX_TASKS.md nói cần rotate (chưa rõ đã rotate chưa). `dangerouslyAllowSVG: true` + `remotePatterns: hostname: "**"` mở cho XSS qua ảnh từ host bất kỳ. |
| Maintainability | **5.5/10** | 19 migration trong 1 tháng, chồng chéo. `docs/` lỗi thời nặng. CODEX_TASKS.md chứa todo nhưng untracked. README mô tả Supabase guide kiểu copy-paste cũ. Branch hiện vẫn là `feat/phase-2-admin-dashboard`, chưa merge main → dễ lệch. |
| Production readiness | **6.5/10** | Site bán được, nhưng còn 2 sản phẩm test lọt public + hero text "abc" + bank fallback fake. CI/CD không thấy file (.github/workflows trống). Không có test tự động. |
| **Điểm tổng** | **6.7/10** | Đang ổn cho bản đầu — bán được. Còn nhiều việc dọn dẹp content + DX + perf trước khi gọi là production-grade. |

---

## 3. Danh sách những thứ cần cải thiện

| Priority | Area | File/Page | Vấn đề | Ảnh hưởng | Đề xuất cải thiện |
|---|---|---|---|---|---|
| **Critical** | Content | Storefront / Supabase data | Product "a" (12.345 ₫) và "Abc" (450.000 ₫) đang lọt public trên /products. | Khách thấy → mất niềm tin thương hiệu | Vào /admin/products → ẩn (deactivate) hoặc xóa 2 sản phẩm này. Không phải sửa code. |
| **Critical** | Content | `store_settings.hero_subtitle` | Hero subtitle trang chủ chứa chữ "abc" test. | Trang chủ trông unfinished | /admin/settings → sửa subtitle về text thật. |
| **Critical** | Security/DB | `supabase/migrations/*` (storage.objects) | Migration mới drop policy admin insert/update/delete trên `storage.objects` bucket `product-images` nhưng KHÔNG re-create với `private.is_admin`. | Replay schema sạch → admin không upload được ảnh. | Thêm migration mới re-tạo 3 policy cho bucket `product-images` dùng `private.is_admin((select auth.uid()))`. Verify production hiện tại bằng cách upload thử ảnh từ /admin. |
| **High** | Security | `next.config.mjs` | `dangerouslyAllowSVG: true` + `remotePatterns: hostname: "**"` mở cửa cho XSS qua SVG + ảnh từ host bất kỳ. | Một admin chèn link SVG độc hoặc một ảnh từ domain attacker → có thể chạy script trong context resey.uk. | Whitelist cụ thể (Supabase storage host) + bỏ `dangerouslyAllowSVG` hoặc đặt CSP nghiêm. |
| **High** | Security | Git history | Commit `256aa4d` đã leak `.env.vercel` chứa `SUPABASE_SERVICE_ROLE_KEY`. CODEX_TASKS.md ghi cần rotate. | Nếu chưa rotate → bypass mọi RLS. | Confirm với user: đã reset `service_role` key trên Supabase Dashboard chưa? Nếu chưa → rotate ngay. |
| **High** | Backend perf | `src/services/admin/adminOrderService.ts:442` | `getOrderAnalytics` chạy 6 query song song, 3 trong số đó SELECT toàn bộ rows (`select total`, `select status`, `select user_id, total`) — không paginate, không cache. | Khi shop có > vài nghìn đơn, dashboard load chậm/timeout. | Thay bằng RPC SQL aggregate (`select count(*), sum(total), …`) hoặc materialized view; cache 1-5 phút. |
| **High** | UX | `/admin/products` desktop | Bảng `min-w-[1240px]` → phải scroll ngang trên laptop 1366×768; cột "Sản phẩm" + "Phân loại" + "Trạng thái" có nhiều badge stack → dài và rối. | Seller non-tech khó nhìn. | Bỏ cột "Loại"/"Phân loại" gộp vào "Tồn kho"; nhóm badge "Trạng thái" thành 1 chip duy nhất hiển thị status chính + tooltip chi tiết. |
| **High** | Type safety | `src/types/supabase.ts` | `export type Database = any` — mất hết type-safe của @supabase/ssr. | Refactor lớn dễ break runtime mà compiler không bắt được. | Chạy `npx supabase gen types typescript --project-id <ref> > src/types/supabase.ts`. Commit vào repo. |
| **High** | Data integrity | `products` table | Sản phẩm test có thể đăng public (chỉ check khi activate, không check khi đã active từ trước). | Storefront chứa rác. | Thêm soft-filter ở `productServerService.getProducts` để loại sản phẩm có title/slug matches `^(a|abc|test|demo|sample)$` HOẶC thêm cron/admin rule kiểm tra định kỳ. |
| **High** | Docs | `docs/architecture.md`, `docs/schema.md`, `docs/api.md`, `docs/README.md` | Mô tả React + Vite + `src/db` + `categories.id integer` + thiếu `product_images`/`product_variants`/`store_settings`/`slug`/`sale_price`. | Người mới đọc làm theo sẽ sai schema và sai stack. | Viết lại theo Next.js App Router + Supabase + migrations thật. Cập nhật ER diagram. |
| **Medium** | UX | `/checkout` | Bank fallback hard-code `0123456789` / `Vietcombank` / `RESEY` nếu `store_settings` thiếu. Khách có thể chuyển nhầm vào số fake. | Mất tiền của khách. | Nếu `store_settings.bank_account_number` rỗng → ẩn tab "Chuyển khoản" hoặc hiển thị "Liên hệ admin để lấy STK". |
| **Medium** | Performance | Storefront RSC fetches | `/`, `/products`, `/products/[slug]` không cache (`createPublicServerSupabase` mỗi request). | TTFB phụ thuộc Supabase region. | Thêm `export const revalidate = 60` ở `/` và `/products`; revalidatePath đã có sẵn ở admin actions. |
| **Medium** | UX | Cart | `CartShoppingPage` không có nút "Cập nhật số lượng tối đa = tồn kho" — `updateQuantity(productId, +1)` không check stock client-side. | Khách bấm + đến khi stock hết → checkout RPC reject. | Client check sellable stock trước khi tăng số lượng; hiện toast cảnh báo. |
| **Medium** | UX | `/admin/products` mobile | Mỗi card có 4 nút (Xem / Sửa / Ẩn / Xóa) trong 1 hàng grid-cols-4 → chữ nhỏ, dễ bấm nhầm. | Khó dùng trên điện thoại. | Gom 2 nút "Ẩn"/"Xóa" vào dropdown "Thêm" hoặc swipe action. |
| **Medium** | Code quality | `src/components/ClientProducts.tsx:170` | Hard-code mapping danh mục EN→VI (`T-Shirts → Áo thun`) trong code. | Khi thêm category, lập trình viên phải sửa file. | Lấy `categories.name_vi` từ DB hoặc dùng `i18n` keys. |
| **Medium** | DB schema | `docs/schema.md` mô tả `categories.id INTEGER` | Code thực tế dùng `category_id: number` nhưng schema thật phải verify. | Nếu drift → JOIN fail. | Generate types và đối chiếu. |
| **Medium** | Observability | `console.error` rải rác | Không có Sentry/Vercel Analytics/Logflare wire up. | Khi production lỗi không biết. | Thêm Sentry client + server (`@sentry/nextjs`) hoặc dùng Supabase logs + Vercel logs có discipline. |
| **Medium** | Code | `src/types/supabase.ts` + service files | Cast `as unknown as ProductType` xuất hiện nhiều lần. | Khó refactor. | Sau khi gen Database types, gỡ dần cast. |
| **Low** | UX | Footer / About / Contact | Chưa kiểm tra sâu (audit chỉ fetch home/products/signin/product detail). | Có thể chứa lorem hoặc placeholder. | QA pass thủ công sau khi xóa test data. |
| **Low** | Code | `useAdmin` hook | Vẫn check qua `admin_users` view client-side rồi fallback `profiles`. Có thể đã không dùng (layout đã guard). | Code duplicate với requireAdmin. | Audit usage; nếu không cần → xóa. |
| **Low** | Migrations | 19 file trong tháng 5 (cleanup_legacy / final_cleanup / final_cleanup_after_legacy / merge_*) | Chuỗi sửa nối tiếp sửa, khó replay từ schema rỗng. | Onboarding dev mới khó. | Sau khi production ổn → squash thành 1 baseline migration mới. |
| **Low** | UX | LanguageSwitcher | Có EN/VI nhưng nhiều text vẫn hard-code Việt. | EN user thấy mix. | Hoặc audit i18n keys, hoặc tạm ẩn switcher. |
| **Low** | UX | ProductCard hover | Quick-add bar "+ thêm vào giỏ" chỉ hiện hover — không bấm được (`<Link>` bọc cả article). | Misleading interaction. | Đổi thành Link rõ ràng "Xem chi tiết" hoặc tách button thật. |
| **Low** | Docs / branch | `CODEX_TASKS.md` untracked | Có task list quan trọng (rotate key) nhưng không commit. | Mất khi clean folder. | Commit nếu cần lưu hoặc move vào docs/. |

---

## 4. Những thứ đang tốt, không nên đụng vào

- **Auth flow + `requireAdmin`** (`src/lib/auth/requireAdmin.ts`): chặt chẽ, profile-based, throw rõ.
- **Server actions ở `src/app/admin/products/actions.ts`**: đã `requireAdmin()` đầu, log Supabase error có code/details/hint, xử lý fallback ẩn vs xóa khi có `order_items` — đúng pattern bảo vệ lịch sử đơn.
- **RPC `create_order_checkout` (atomic checkout)**: giữ stock-safety server-side, không nên thay bằng client insert nhiều bảng.
- **`processLock` thay `navigatorLock`** (`src/lib/supabase/client.ts`): mới fix deadlock — đừng revert.
- **Singleton `getSupabaseClient()` + clearStaleSupabaseCookies**: cũng vừa fix bug nhiều client gây nghẽn.
- **`withTimeout` wrapper** trên admin queries: cần thiết để báo lỗi rõ ràng cho seller (đừng bỏ).
- **`Navbar`, `ProductCard`, KPI cards** UI streetwear — đã đúng phong cách brand.
- **`isPubliclyVisibleProduct` filter** chạy server-side trước khi render — đúng nguyên tắc.
- **Migrations RLS init-plan optimization** (`20260526130000_rls_initplan_cache_isadmin.sql`): đã tối ưu — đừng đụng.
- **`getPublishReadiness`** guard trong `createAdminProductAction` / `updateAdminProductAction` / `activateAdminProductAction`: ngăn admin publish sản phẩm thiếu ảnh / chưa category / test data — giữ nguyên.
- **`signup`/`signin` form**: chuẩn shadcn + i18n + redirect safe.
- **Storage upload validation** (`validateProductImageFile`): MIME + 5MB check — đủ.

---

## 5. Kế hoạch cải thiện đề xuất

### Phase 1 — Sửa risk production (làm ngay)
1. **Confirm rotate `SUPABASE_SERVICE_ROLE_KEY`** với user (theo CODEX_TASKS.md).
2. Xóa / ẩn 2 sản phẩm test "a" và "Abc" qua /admin/products.
3. Sửa `store_settings.hero_subtitle` (bỏ "abc") qua /admin/settings.
4. Verify storage RLS bucket `product-images` còn cho admin upload không. Nếu không → thêm migration tạo lại 3 policy với `private.is_admin`.
5. Sửa `next.config.mjs`: bỏ `dangerouslyAllowSVG`, whitelist Supabase host cụ thể.
6. Ẩn tab "Chuyển khoản" khi `store_settings` chưa có bank info thật (hoặc bắt admin set bank trước khi enable).
7. Thêm filter blacklist title/slug `^(a|abc|test|demo|sample|aaa|123)$` ở `productServerService.getProducts`.

### Phase 2 — Cải thiện admin dashboard
1. Bảng /admin/products: bỏ bớt cột, gom badge "Trạng thái" thành 1 chip + tooltip. Mục tiêu fit 1280px không scroll ngang.
2. Mobile card admin: nhóm "Ẩn/Xóa" vào dropdown.
3. Tạo trang `/admin/orders/[id]` riêng thay vì chỉ modal (deep-link tốt hơn).
4. KPI dashboard: thêm filter date-range cho doanh thu.
5. Thêm log activity table (audit log) cho hành động admin.

### Phase 3 — Tối ưu performance
1. Thêm `export const revalidate = 60` cho `/` và `/products`; `revalidate = 300` cho `/products/[slug]`.
2. Viết SQL function `get_order_analytics()` trả về aggregate JSON; thay 6 query trong `adminOrderService.getOrderAnalytics`.
3. Thêm index check qua `mcp__supabase__get_advisors` rồi quyết định index nào nên thêm.
4. Cấu hình `images.remotePatterns` chặt (chỉ Supabase storage host).
5. Bật Vercel Analytics + Speed Insights.

### Phase 4 — Cải thiện UI/UX
1. Sửa Quick-add bar trên ProductCard (đừng hứa hành động không có).
2. Cart: cảnh báo khi tăng số lượng vượt stock.
3. Checkout: hiện step indicator (Thông tin → Phương thức → Xác nhận).
4. Empty/loading states đồng bộ (đã có ShoppingSkeleton, ErrorState — chuẩn hoá hơn).
5. Audit i18n: hoặc hoàn thiện EN, hoặc tạm ẩn `LanguageSwitcher`.
6. Footer/About/Contact: QA nội dung Việt, bỏ placeholder nếu còn.

### Phase 5 — Refactor nhẹ
1. Generate `Database` types và gỡ `: any`.
2. Squash migrations thành 1 baseline mới sau khi production stable.
3. Cập nhật `docs/README.md`, `docs/architecture.md`, `docs/schema.md`, `docs/api.md` cho khớp Next.js + Supabase + schema thật.
4. Gỡ `useAdmin` hook nếu không còn caller.
5. Move category EN→VI mapping vào DB column hoặc i18n.

---

## 6. Checklist test thủ công sau khi sửa

### Storefront (chưa đăng nhập)
- [ ] `/` load, hero text đúng, không còn "abc".
- [ ] `/` featured products không có item rác (a, Abc, test…).
- [ ] `/products` không hiển thị product test.
- [ ] `/products` filter category / size / color / stock + search hoạt động + cập nhật URL.
- [ ] `/products/[slug]` load, image gallery, size selector, color selector, stock label đúng.
- [ ] `/products/[slug]` thêm vào cart → cart icon counter tăng.
- [ ] `/cart` hiện đúng giá, size/color, tổng tiền; tăng/giảm số lượng OK.
- [ ] `/cart` bấm "Thanh toán" khi chưa login → redirect /signin với `returnTo=/cart` hoặc `/checkout`.
- [ ] Responsive: mobile (<768px), tablet (768–1024), desktop (1280+) không vỡ layout.
- [ ] /about, /contact, /shipping-policy, /privacy-policy, /size-guide, /payment-guide, /return-policy: nội dung Việt sạch, không placeholder.

### Auth
- [ ] Đăng ký bằng email mới → nhận email confirm → click link → login OK.
- [ ] Đăng nhập sai password → error message Việt rõ ràng.
- [ ] Reset password → email → update → login lại OK.
- [ ] Đăng xuất → cart guest còn không?

### Checkout flow
- [ ] Form trống → button disabled.
- [ ] SĐT sai format → báo lỗi.
- [ ] Province/District/Ward cascade đúng.
- [ ] COD: submit → order tạo → redirect /checkout/success với order_id.
- [ ] Bank transfer: hiện đúng bank info từ store_settings; transfer code preview hợp lệ.
- [ ] Sau khi submit → `/admin/orders` thấy order mới ở trạng thái "Mới".

### Admin (sau khi login bằng tài khoản admin)
- [ ] /admin load nhanh (<3s), KPI cards đúng số.
- [ ] /admin/products: tabs Đang bán / Nháp / Cần sửa / Hết hàng / Tạm ẩn count chính xác.
- [ ] /admin/products/new: tạo sản phẩm mới (title, slug, price, stock, category, sizes, colors, upload ảnh) → save → thấy sản phẩm trên /products khi `is_active = true`.
- [ ] Upload ảnh: ảnh thật lên Supabase storage `product-images` bucket OK, không lỗi RLS.
- [ ] Edit variant: thêm size/color/stock → save → /admin/products bảng cập nhật.
- [ ] Ẩn sản phẩm → /products không còn thấy.
- [ ] Xóa sản phẩm có order cũ → auto chuyển sang trạng thái ẩn (không xóa cứng).
- [ ] /admin/orders: load, filter status, filter date OK.
- [ ] Đổi trạng thái đơn (pending → processing → shipped → delivered) → user dashboard cập nhật.
- [ ] /admin/settings: sửa hero text, bank info → /, /checkout phản ánh.
- [ ] /admin/users: list users, có thể disable/promote.

### Performance smoke
- [ ] /admin load <5s ngay cả với 50 sản phẩm + 100 đơn.
- [ ] /products LCP <2.5s trên mobile 4G simulate.

### Security smoke
- [ ] Truy cập /admin/* khi chưa login → redirect /signin.
- [ ] Login user thường → vào /admin → throw "Admin access required".
- [ ] Curl `https://resey.uk/api/...` (nếu có) không lộ service role.
- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` đã rotate sau leak.

---

**End of audit. Không sửa code nào trong bước này.**
