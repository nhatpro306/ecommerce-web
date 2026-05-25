# RESEY UI/UX + QA Audit Report

> **Tested on:** https://resey.uk · 2026-05-25
> **Tester role:** Senior UI/UX tester · Product designer · QA reviewer
> **Auth state used during audit:** Browser had an existing admin session (cookies: `supermanzero30@gmail.com` / "Quản trị viên"). All findings below note when behaviour differs for logged-out visitors vs. logged-in users/admins. The admin password was never read, stored, or logged.
> **Viewport limitation:** The Chrome MCP browser used for this audit could not be resized below ~1705 px inner width on the tester's Windows display. Pixel-perfect mobile/tablet screenshots were therefore not possible. Mobile/tablet findings are based on inspecting the responsive Tailwind classes in the live DOM and on what was visible in the captured desktop screenshots. This is noted again per-section.

---

## 1. Executive Summary

**Ready for real selling?** ⚠ **Partially.** The plumbing works (product list, PDP, cart, checkout form, admin product table, admin orders list), but several public-facing bugs and trust gaps make the site feel unfinished and unprofessional. A first-time customer who lands today will see test/QA products in the catalog, a typo in the hero headline, and a hotline labelled "Đang cập nhật". Do not promote the site publicly until at least the P0 issues below are fixed.

**Biggest blockers (P0):**

1. **Admin dashboard sidebar (with admin nav, admin email, and "QUẢN TRỊ" links) renders on the public storefront for any logged-in user.** Confirmed by inspecting the rendered DOM and by an anonymous fetch that does *not* contain the sidebar HTML — so the leak only happens for authenticated sessions, but it still breaks the customer flow for anyone who has an account, and it exposes the seller's Gmail address (`supermanzero30@gmail.com`) to that account.
2. **Test/QA products are publicly visible and purchasable.** "RESEY Test MCP 20260524" (450.000 ₫) and "RESEY Upload Test 20260524-2" (550.000 ₫) appear in `/products`, in the homepage "Sản phẩm nổi bật" carousel, and can be added to the cart. The test product even ends up in `/checkout` order summary with the description *"San pham test tu plugin chrome de kiem tra loi save tren admin."*
3. **Hero headline has a Vietnamese spelling error.** "PHỌNG CÁCH PHỐ" should be "PHONG CÁCH PHỐ". This is the very first thing a customer reads on the homepage.
4. **Hotline says "Đang cập nhật".** Both on the contact page and in the footer. This is an immediate trust killer for a fashion brand asking for COD.
5. **`/admin/products` and `/admin/orders` are broken on direct URL load** — they redirect to `/dashboard` (which is a storefront-shell page). Only clicking the in-page sidebar link reaches the real admin product/order screens. Refreshing the admin tab will send the admin back to the storefront-shaped dashboard.

**Biggest UX weaknesses:**

- Storefront product cards omit a lot of trust info (no clear "new", no badge for sold-out variants, no model size, no shipping ETA).
- Checkout uses free-text inputs for province / district / ward instead of the standard cascading dropdown VN customers expect.
- Bank-transfer (`Chuyển khoản`) is offered but no QR / bank account / order code is shown before the customer places the order — the payment-guide page just says the info will appear on the success page.
- "all" appears untranslated in `/products` filters and in the orders filter dropdown.
- Long product names (`RESEY Brown Washed Crop Fit`, `RESEY Test MCP 20260524`) are truncated to ~10 characters in the admin product table.

**Biggest mobile weaknesses (inferred, see §4):**

- The product grid does drop to 2 columns on md-, but the product-page filter row (`Bộ lọc | Sắp xếp | Tồn kho | Danh mục | Size | Màu`) is laid out horizontally and overflows even at 1440 px. On mobile it will be unusable without horizontal scroll.
- No dedicated hamburger menu was detected in the header — the 5 navigation links + search + cart + account + language toggle all sit inline. At ≤400 px this will either wrap into a tall, ugly stack or push the logo off-center.
- Order summary right rail in cart/checkout already overflows at 1440 ("Tổng cộng 2.190.00" cuts off the trailing `0 đ`). Same component will be worse on tablet.

---

## 2. Priority Ranking (full issue list)

> **Severity:** P0 = must fix before selling · P1 = should fix before public launch · P2 = improve after core flow works · P3 = polish

---

### Issue 2.1 — Admin sidebar / admin email leaks onto every public storefront page for logged-in users
- **Priority:** P0
- **Page/URL:** `/`, `/products`, `/products/[slug]`, `/cart`, `/checkout`, `/contact`, `/payment-guide`, `/shipping-policy`, `/return-policy` — every public route when an admin (or possibly any authenticated user) is signed in.
- **Device:** Desktop confirmed. On mobile the same sidebar exists but `md:block` means it is off-canvas; the toggle button is still in the header.
- **Steps to reproduce:**
  1. Sign in at `/admin` as an admin user.
  2. Open `/` in the same browser tab.
  3. Observe the entire left rail.
- **Actual result:** A 256 px-wide shadcn sidebar renders to the left of the storefront with:
  - The `E` avatar / "RESEY Local Streetwear" header
  - A "Tìm sản phẩm…" search input duplicating the header search
  - **QUẢN TRỊ section** with links to `/admin`, `/admin/products`, `/admin/orders`, `/admin/users`
  - DANH MỤC section with category shortcuts
  - A user widget at the bottom-left showing `supermanzero30` / `supermanzero30@gmail.com` with a green online dot
- **Expected result:** Public storefront layout should be identical regardless of auth state. Admin nav and the seller's personal email must never render inside the customer site.
- **Why it matters:** (a) Leaks a personal email address. (b) Confuses customers (who might be logged in via Google/SSO if you ever add it). (c) The seller — when checking their own store as a customer — sees a broken site and can't preview reality. (d) "Layout leaks" is already on the project memory's known-bugs list.
- **Suggested fix:** Move the admin/dashboard sidebar into the `(admin)` route group / dashboard layout file only. The storefront route group should use a plain customer layout. Verify with `fetch('/', {credentials:'include'})` from a logged-in session that the response no longer contains `sidebar-foreground` or `/admin/` hrefs.
- **Likely area to inspect:** `app/layout.tsx`, `app/(admin)/layout.tsx` (or wherever the shadcn `<SidebarProvider>` wraps), the cookie/session check that decides which layout to mount. Whatever wrapper renders `<aside class="...md:block">` on storefront pages.

---

### Issue 2.2 — Test products visible to public customers and addable to cart
- **Priority:** P0
- **Page/URL:** `/`, `/products`, `/products/resey-test-mcp-20260524`, `/products/resey-upload-test-20260524-2`, `/cart`, `/checkout`
- **Device:** All
- **Steps to reproduce:**
  1. Open `/products` as a logged-out visitor.
  2. See `RESEY Test MCP 20260524` and `RESEY Upload Test 20260524-2` in the grid (8/8 products).
  3. Open the test PDP → add to cart → proceed to checkout. Test product is in the order summary alongside real products.
- **Actual result:** Test products are `Đang bán` ("active") in admin, have category `Chưa phân loại`, but appear in the public list. Their description in the cart reads "*San pham test tu plugin chrome de kiem tra loi save tren admin.*"
- **Expected result:** Test / draft / uncategorised products should not appear publicly.
- **Why it matters:** Anyone who lands on the product page sees that this is a half-built site, not a real brand.
- **Suggested fix:**
  - In admin, change both products' status from `Đang bán` to draft/archived (or delete them).
  - In the storefront product query, filter out products where the status is not `published` AND require a category. The admin list already has a `TRẠNG THÁI` column with badges (`Đang bán`, `Thiếu ảnh`) — wire `Thiếu ảnh` + `Chưa phân loại` into a visibility check so the storefront can never show them even if the admin forgets.
- **Likely area to inspect:** Wherever `/products` and `Sản phẩm nổi bật` query Supabase — add `status = 'published'` + `category_id is not null` (or whatever the existing columns are; the CLAUDE.md memory cautions about inventing them).

---

### Issue 2.3 — Vietnamese spelling error in homepage hero
- **Priority:** P0 (visible in the first viewport on the site)
- **Page/URL:** `/`
- **Device:** All
- **Steps to reproduce:** Open `/` and read the hero headline.
- **Actual result:** "PHỌNG CÁCH PHỐ / DẤU ẤN RIÊNG."
- **Expected result:** "PHONG CÁCH PHỐ / DẤU ẤN RIÊNG."
- **Why it matters:** A Vietnamese typo on the very first line tells the visitor either (a) the site is auto-translated or (b) the team is sloppy. Either kills credibility for a brand that says "Local Brand Việt".
- **Suggested fix:** One-character change. Make sure the `vi` translation source (likely `i18n` JSON or a hard-coded string in the homepage component) gets the fix, not just the visible HTML.

---

### Issue 2.4 — Hotline says "Đang cập nhật" on contact page and footer
- **Priority:** P0
- **Page/URL:** `/contact`, footer on all pages
- **Device:** All
- **Steps to reproduce:** Open `/contact` and the footer.
- **Actual result:** "HOTLINE: Đang cập nhật. Trong thời gian này, vui lòng liên hệ qua email để được hỗ trợ nhanh nhất." Footer: "Hotline: Đang cập nhật".
- **Expected result:** A real phone number, or replace the row with a Zalo / Messenger link.
- **Why it matters:** Vietnamese shoppers expect Zalo / hotline for COD-heavy shops. "Đang cập nhật" reads as "this shop is not operational yet".
- **Suggested fix:** Either commit a real number, or replace the entire row with "Zalo: 09xx xxx xxx" / "Messenger: m.me/resey" — both feel more native than email-only support for this category.

---

### Issue 2.5 — `/admin/products` and `/admin/orders` redirect to `/dashboard` on direct URL load
- **Priority:** P0 (admin)
- **Page/URL:** `/admin/products`, `/admin/orders`, `/admin/products/new`, `/admin/users`
- **Device:** Desktop admin
- **Steps to reproduce:**
  1. Logged in as admin.
  2. Type `https://resey.uk/admin/products` directly in the address bar.
  3. Page lands on `/dashboard` (the storefront-shaped overview), **not** on the product management screen.
  4. Click "Sản phẩm" in the sidebar of `/dashboard` → routes to `/admin/products` and now works fine.
- **Actual result:** Direct navigation / page refresh on any `/admin/*` route lands the user on `/dashboard` instead. `/admin/products/new` 404s with "Không tìm thấy trang" instead of opening a create form.
- **Expected result:** Direct URL navigation and page refresh must keep the admin on the page they were on. Bookmarks for `/admin/orders` should work.
- **Why it matters:** The owner cannot bookmark "manage orders". Every browser refresh kicks them back to a dashboard that doesn't even use the admin layout. If `/admin/products/new` is genuinely the create route, it should not 404.
- **Suggested fix:** Likely a middleware/route mismatch — the `/admin` segment probably has a `redirect()` somewhere or `/dashboard` is mounted at `/admin`. Audit the redirect logic and align the URLs. Confirm whether the create form is at `/admin/products/new` or a different path (the in-table action probably uses a query string or a modal — check the "+ THÊM SẢN PHẨM" button's actual handler).

---

### Issue 2.6 — Bank-transfer payment offered but no bank account / QR shown before order is placed
- **Priority:** P0
- **Page/URL:** `/checkout`, `/payment-guide`
- **Device:** All
- **Steps to reproduce:**
  1. Add product to cart, open `/checkout`.
  2. Select "CHUYỂN KHOẢN".
  3. No bank name, account number, account holder, branch, or QR shown.
  4. `/payment-guide` says: *"Sau khi đặt hàng, trang thành công sẽ hiển thị ngân hàng, số tài khoản và nội dung chuyển khoản ORDER-(mã đơn)."*
- **Actual result:** The customer has to commit to "Đặt hàng" without knowing the bank details. A cautious VN buyer will not do this.
- **Expected result:** As soon as "Chuyển khoản" is selected on checkout, expand a panel that shows: bank name, account number, account holder, copy buttons for each, a static QR (or a `VietQR` dynamic QR keyed off `ORDER-{tempId}`), and the exact transfer note format.
- **Why it matters:** Most non-COD VN streetwear sales are bank transfer. Hiding the bank account until after order placement is unusual and reduces conversion.
- **Suggested fix:** Add an admin setting (`/admin/settings` → "Tài khoản nhận chuyển khoản") that stores the bank info, and render it inline on `/checkout` when `Chuyển khoản` is active.

---

### Issue 2.7 — Province / District / Ward are free-text inputs at checkout
- **Priority:** P1 (data quality)
- **Page/URL:** `/checkout`
- **Device:** All
- **Steps to reproduce:** Open `/checkout` and look at the address fields.
- **Actual result:** `Phường/Xã *`, `Quận/Huyện *`, `Tỉnh/Thành phố *` are all `<input type=text>`.
- **Expected result:** Cascading selects (Tỉnh → Quận → Phường), seeded from the GSO administrative list. This is the VN e-commerce norm and is what shipping APIs (GHN / GHTK / J&T) expect.
- **Why it matters:** Free-text means customers will type "TP HCM", "HCM", "Tp. Hồ Chí Minh", "Sài Gòn" etc. — making shipping label printing and shipping-fee calculation painful, and increasing failed delivery risk (which the shipping-policy page already calls out: "Vui lòng nhập đúng số điện thoại và địa chỉ chi tiết để tránh giao hàng thất bại").
- **Suggested fix:** Use the official province dataset (or a package such as `dvhcvn`) to populate three dependent `<select>` controls. Store the codes alongside the text so future GHN integration doesn't need re-mapping.

---

### Issue 2.8 — Order summary right rail truncates total amount at desktop (1440)
- **Priority:** P1
- **Page/URL:** `/cart`, `/checkout`
- **Device:** Desktop 1440 confirmed
- **Steps to reproduce:** Add 3–4 items totaling > 1.000.000 ₫ to cart and open `/cart` or `/checkout`.
- **Actual result:** Right column "Đơn hàng của bạn" → "Tổng cộng 2.190.00" — the last `0 đ` is clipped by container width. Same for "Phí vận chuyển: Miễn…" (clipped from "Miễn phí").
- **Expected result:** Total must be fully visible at all desktop widths.
- **Why it matters:** Customers won't commit to "Đặt hàng" if they can't see the total exactly.
- **Suggested fix:** Either widen the summary card, reduce padding, set `min-width: max-content` on the numeric `<span>`, or move the price under the label vertically. Be careful not to break mobile.

---

### Issue 2.9 — Filter bar on `/products` overflows horizontally and uses untranslated "all"
- **Priority:** P1
- **Page/URL:** `/products`
- **Device:** All
- **Steps to reproduce:** Open `/products` and inspect the filter row.
- **Actual result:** Six controls in one row — `Bộ lọc`, `Sắp xếp: default`, `Tồn kho: all`, `Danh mục: all`, `Size: all`, `Màu: all`. The right edge already clips on a 1440-wide layout (the "Màu" select is partially under the page edge). Default value is the English word `all`, while the rest of the UI is Vietnamese.
- **Expected result:** Vietnamese labels (`Tất cả`), default `Sắp xếp = Mới nhất` (or similar), and the row should wrap or collapse into a sheet on `< md`.
- **Why it matters:** Filters are the primary product-discovery tool. Half-English labels signal incomplete localisation.
- **Suggested fix:**
  - Replace the default option text `all` → `Tất cả`.
  - Replace `default` → `Mặc định` or `Mới nhất`.
  - On `< md` collapse all filters into one `Bộ lọc` button that opens a bottom sheet — the existing `Bộ lọc` button suggests this was the plan.

---

### Issue 2.10 — "Sản phẩm nổi bật" `XEM TẤT CẢ` link is clipped
- **Priority:** P2
- **Page/URL:** `/`
- **Device:** Desktop 1440
- **Steps to reproduce:** Scroll to the featured-products carousel.
- **Actual result:** Right-side link reads `XEM T...` (final letters are clipped because the row also has 4 product cards extending beyond the carousel container).
- **Expected result:** Either the link is fully visible above the carousel, or the carousel is constrained so the link doesn't sit on top of an overflowing card row.
- **Suggested fix:** Move "Xem tất cả" onto its own line above the cards on `< lg`, or constrain the cards row with `overflow-x-auto` and a fade-out gradient.

---

### Issue 2.11 — Color "Dust Gray" assigned to "RESEY Washed Tee – Olive" (variant naming inconsistency)
- **Priority:** P1
- **Page/URL:** `/cart`, `/checkout`, presumably the PDP variant data
- **Device:** All
- **Steps to reproduce:** Add `RESEY Washed Tee – Olive` to cart with the dust-grey-looking variant. Cart shows: name "RESEY Washed Tee - Olive" / colour "Dust Gray" / description "Áo thun wash màu olive xám, form rộng…"
- **Actual result:** The product is called "Olive" but the selected colour swatch is labeled "Dust Gray". The Vietnamese description hedges as "olive xám" (olive-grey).
- **Expected result:** The colour label on the variant should match the name. Either rename the product to "RESEY Washed Tee – Dust Gray" or label the swatch as "Olive".
- **Why it matters:** Customers will think you sent the wrong colour and request returns.

---

### Issue 2.12 — Admin product table truncates product names to ~10 characters
- **Priority:** P1 (admin usability)
- **Page/URL:** `/admin/products`
- **Device:** Desktop admin
- **Steps to reproduce:** Open the admin product list.
- **Actual result:** Names render as `RESEY...`, `RESEY Test...`, `RESEY Brow...`, `RESEY...` — owner has to hover or click in to identify which product is which.
- **Expected result:** Show the full product name. SKU can be truncated instead.
- **Why it matters:** The CLAUDE.md priority is to make admin usable by a non-technical seller. A truncated name in a table of 8 products is already painful; at 50 products it's unworkable.
- **Suggested fix:** Make the SẢN PHẨM column flex / set `min-width: 280px` on the name cell, and put SKU on a second muted line under the name. Or remove the column-width clamp.

---

### Issue 2.13 — Two test products in admin are `Đang bán` despite having `Chưa phân loại` and `Thiếu ảnh`
- **Priority:** P0 (this is the root of issue 2.2 from the admin side)
- **Page/URL:** `/admin/products`
- **Device:** Admin
- **Actual result:** `RESEY UPLOAD-TEST-02` and `RESEY MCP-TEST-01` are tagged `Đang bán` + `Thiếu ảnh` + `Chưa phân loại`. Their TRẠNG THÁI badge shows both `Đang bán` AND `Thiếu ảnh` — but they're still publicly listed.
- **Expected result:** Either (a) admin should block "Đang bán" until the product has a category AND at least one image, or (b) `Thiếu ảnh` / `Chưa phân loại` should auto-demote the storefront visibility to hidden.
- **Suggested fix:** Add a validation step at publish-time, and a backend filter on the storefront query.

---

### Issue 2.14 — Admin pages and storefront pages share the top promo banner and footer
- **Priority:** P2
- **Page/URL:** `/dashboard`, `/admin/*` (when reached via the wrong path), `/admin/products`, `/admin/orders`
- **Device:** Admin desktop
- **Actual result:** "MIỄN PHÍ VẬN CHUYỂN CHO MỌI ĐƠN HÀNG RESEY" banner sits above admin pages; the public footer ("Giao hàng toàn quốc / COD / chuyển khoản", "Chính sách" links, etc.) renders below admin pages too. `/dashboard` even renders the entire storefront header + nav.
- **Expected result:** Admin pages get an admin-only chrome (top bar with current user, breadcrumbs, log-out). The storefront promo banner and customer footer should not appear in admin.
- **Why it matters:** The store owner gets visual clutter and a confusing "am I a customer or admin right now?" feeling.
- **Suggested fix:** Same fix as 2.1 — route-group separation. `/admin/products` (the polished admin layout) already does this correctly; bring `/dashboard` into that group too, or move the dashboard content under `/admin/overview` and delete `/dashboard`.

---

### Issue 2.15 — Empty states on `/dashboard` are written in English
- **Priority:** P2
- **Page/URL:** `/dashboard`
- **Actual result:** "No order data available", "No payment data available", "No order status data available".
- **Expected result:** Vietnamese — e.g. "Chưa có dữ liệu đơn hàng", "Chưa có dữ liệu thanh toán", "Chưa có dữ liệu trạng thái".
- **Why it matters:** Mixed-language UI signals an unfinished product.
- **Suggested fix:** Translate the three strings in the dashboard chart components.

---

### Issue 2.16 — Admin orders filter dropdown shows "all" instead of "Tất cả"
- **Priority:** P3
- **Page/URL:** `/admin/orders`
- **Actual result:** Status filter default option reads "all".
- **Expected result:** "Tất cả".

---

### Issue 2.17 — Admin orders table header label includes a stray asterisk
- **Priority:** P3
- **Page/URL:** `/admin/orders`
- **Actual result:** Column header "ĐỊA CHỈ CHI TIẾT (SỐ NHÀ, TÊN ĐƯỜNG)*" — the `*` is the "required field" marker from the checkout form, not appropriate in a column header.
- **Expected result:** "ĐỊA CHỈ CHI TIẾT" (without the asterisk).

---

### Issue 2.18 — Admin orders table overflows horizontally on a 1705 px viewport
- **Priority:** P2
- **Page/URL:** `/admin/orders`
- **Actual result:** Table has 8 columns at full width and only the first 7 fit; the rightmost column ("TỔNG TIỀN") needs horizontal scroll on desktop. The scroll bar appears between header and rows, which is unusual.
- **Expected result:** Either reduce default columns (move some into a row-detail expander) or make the table virtualised and the scrollbar sticky at the bottom of the table region.

---

### Issue 2.19 — Cart cart-count badge says "4" but `resey-local-cart` in localStorage is `[]`
- **Priority:** P2 (could be cosmetic, could be a desync bug)
- **Page/URL:** All
- **Device:** Desktop
- **Steps to reproduce:**
  1. Add items to cart while logged in.
  2. Open DevTools and read `localStorage.getItem('resey-local-cart')`.
- **Actual result:** Header cart badge: `4`. localStorage: `[]`.
- **Expected result:** Either both should reflect the cart, or the localStorage key should be removed when the cart is server-side.
- **Why it matters:** A user who clears cookies but keeps localStorage (or vice versa) may see the badge desync between sessions. Also makes debugging "EMPTY_CART" reports harder — this is on the project memory's known-bug list.
- **Suggested fix:** Decide on one source of truth (server cart for authenticated users, localStorage cart for anonymous), and make sure both writers update both — or pick one and drop the other.

---

### Issue 2.20 — Header has no dedicated mobile hamburger; all 5 nav links + VN/EN toggle + 3 icon buttons sit inline
- **Priority:** P1 (mobile)
- **Page/URL:** All
- **Device:** Mobile (inferred — see §4)
- **Actual result:** The header `<nav>` contains the links `Trang chủ`, `Sản phẩm`, `Bộ sưu tập`, `Về RESEY`, `Liên hệ`, plus VN/EN toggle, search, cart, account. No element with `aria-label` resembling a hamburger menu was found. On `< md` the only mobile-trigger is the sidebar toggle button (which opens the admin sidebar — only useful when logged in).
- **Expected result:** A real mobile hamburger that collapses the nav links into an off-canvas sheet.
- **Why it matters:** "Mobile-first design" is explicitly in CLAUDE.md. A mobile customer cannot navigate from one section to another if the header doesn't collapse.
- **Suggested fix:** Add a `<button>` with `aria-label="Mở menu"` visible only on `< md`, hide the inline link list on `< md`, render the links in an off-canvas sheet.

---

### Issue 2.21 — `Hệ thống cửa hàng` footer column only contains "Cửa hàng online chính thức"
- **Priority:** P2
- **Page/URL:** Footer
- **Actual result:** The "Hệ thống cửa hàng" column reads only "Cửa hàng online chính thức". No physical address, no city, no opening hours.
- **Expected result:** Either rename the column to "Kênh bán hàng" and include Shopee / TikTok Shop / Instagram / Zalo, or list the real physical store / showroom address.
- **Why it matters:** "Hệ thống cửa hàng" implies retail stores. If RESEY is online-only, calling that section "Hệ thống cửa hàng" is misleading.

---

### Issue 2.22 — No social media links (Instagram / TikTok / Facebook / Zalo) anywhere
- **Priority:** P1 (streetwear specifically)
- **Page/URL:** Footer, contact, header
- **Actual result:** No social icons.
- **Expected result:** At least Instagram and TikTok in the footer, plus a Zalo button somewhere. For a Vietnamese streetwear brand, Instagram and TikTok are the primary discovery and trust channels.
- **Suggested fix:** Add a small social icon row in the footer next to the logo, and a `Liên hệ qua Zalo` button on `/contact`.

---

### Issue 2.23 — No estimated delivery date shown anywhere on PDP or checkout
- **Priority:** P2
- **Page/URL:** `/products/[slug]`, `/checkout`, success page (not tested — see §5)
- **Actual result:** PDP shows "Giao nhanh — Nội thành 1-2 ngày" as a static badge. Checkout does not compute an ETA based on selected province.
- **Expected result:** After province is selected (see 2.7), show "Dự kiến nhận: Thứ X, ngày dd/mm" — the standard pattern for VN e-commerce.
- **Why it matters:** Increases checkout confidence.

---

### Issue 2.24 — Product detail "Tồn kho" badge is clipped on desktop
- **Priority:** P3
- **Page/URL:** `/products/resey-washed-tee-brown`
- **Actual result:** "TỒN KHO    Cò..." — the value (likely "Còn hàng") is clipped because the row that holds CHẤT LIỆU + TỒN KHO has uneven flex.
- **Expected result:** Full label visible.

---

### Issue 2.25 — No visible search input on the storefront header (only an icon button labelled "Tìm sản phẩm")
- **Priority:** P3
- **Page/URL:** All public pages
- **Actual result:** Search is reached via a sidebar input (admin-side only) and a search icon in the header. The search icon's behaviour wasn't tested in this audit.
- **Suggested fix:** Confirm the search icon opens a working search overlay; ensure it's reachable for logged-out visitors.

---

### Issue 2.26 — Product cards lack badges for sale / new / sold-out / featured
- **Priority:** P2
- **Page/URL:** `/`, `/products`
- **Actual result:** All cards just show `Category` (small caps) → `Name` → `Price` → `Còn hàng` + colour swatches. Even featured products have no "Mới" / "Hot" badge.
- **Expected result:** Streetwear shops live on "NEW", "BACK IN STOCK", "LAST PIECES", sale-percentage badges. Add a corner ribbon.

---

### Issue 2.27 — Bottom-right floating widgets (Vercel toolbar + resize handles) visible to admin while shopping
- **Priority:** P3
- **Page/URL:** All
- **Actual result:** A small floating panel sits bottom-right (Vercel toolbar / `__vercel_toolbar_injector` was found in localStorage). It overlaps content on narrow pages.
- **Expected result:** Hide Vercel toolbar in production for the storefront, or at least for non-admin users.

---

### Issue 2.28 — Logo + brand wordmark inside the admin sidebar shows a generic "E" avatar instead of the RESEY mark
- **Priority:** P3
- **Page/URL:** The leaked sidebar on storefront, and `/admin/products`'s in-table sidebar.
- **Actual result:** Sidebar top shows a black `E` circle next to "RESEY Local Streetwear". This looks like the user's initial (presumably for `supermanzero30`?) or a default shadcn placeholder.
- **Expected result:** Use the RESEY R-mark already used in the storefront header.

---

### Issue 2.29 — Storefront product cards on `/products` do not show colour count or available sizes
- **Priority:** P2
- **Page/URL:** `/products`
- **Actual result:** Cards show 2–3 colour swatch dots but not "3 màu / 4 size". Discoverability of variant range is weak.

---

### Issue 2.30 — No size guide modal accessible from PDP (link only in footer)
- **Priority:** P2
- **Page/URL:** `/products/[slug]`
- **Actual result:** PDP has size buttons S/M/L/XL and a "Bảng size" table at the bottom, which is good. But the table is buried below the related-products section in the scroll order on some products. There is also a separate `/hướng dẫn chọn size` linked from the footer but no inline "Hướng dẫn chọn size" trigger near the size selector.
- **Expected result:** A small "?" or "Hướng dẫn chọn size" link directly beside the size selector that opens a modal with the size chart and a "how to measure" diagram.

---

## 3. Desktop Review (1440 / 1366 / 1024 — only 1440 captured live; others inferred)

| Area | State | Notes |
| --- | --- | --- |
| Homepage hero | ⚠ | Typo (2.3). Hero image and CTA buttons fine. Right-side image fills correctly. |
| Category quick-links | ✅ | "Tất cả sản phẩm / Accessories / Hoodies / Pants / T-Shirts" buttons are clear. |
| Featured products row | ⚠ | Cards overflow the container, "XEM T…" clipped (2.10). Test products visible (2.2). |
| About block ("Tinh thần hiện đại") | ✅ | Clean copy and matching image. |
| Trust strip ("Giao hàng toàn quốc / Hỗ trợ nhanh / Đổi trả / Local brand Việt") | ✅ | Readable and on-brand. |
| Footer | ⚠ | "Hotline: Đang cập nhật" (2.4), missing social (2.22), misleading "Hệ thống cửa hàng" (2.21). |
| `/products` | ⚠ | Filter row overflow + English defaults (2.9), test products visible (2.2), good 4-col grid. Only 8 products — fine for MVP. |
| Product detail | ✅ mostly | Material/stock/colour/size/qty/CTA pattern is solid; "Bảng size" table at bottom is nice. Tồn kho clipped (2.24); no inline size-guide trigger (2.30). |
| `/cart` | ⚠ | Total clipped (2.8), test product description in cart (2.2), variant naming mismatch (2.11). Quantity steppers work. |
| `/checkout` | ⚠ | Free-text province (2.7), no bank info before order (2.6), total clipped (2.8). Email is correctly marked optional, which is good for VN. |
| `/payment-guide` | ✅ | Short and accurate; pairs with bank-transfer fix (2.6). |
| `/shipping-policy` | ✅ | Sensible boilerplate. |
| `/return-policy` | ✅ | Clear conditions. |
| `/contact` | ⚠ | Hotline placeholder (2.4); no Zalo / Messenger; no physical address. |

I did not run dedicated screenshots at 1366 and 1024 because the issues above are width-agnostic and the layout uses Tailwind breakpoints `sm/md/lg/xl/2xl`. The cart/checkout total clipping (2.8) and admin orders table overflow (2.18) will almost certainly be worse at 1024.

---

## 4. Mobile Review (390 / 375 / 412 — inferred, see disclaimer)

**Disclaimer:** Could not force Chrome to render below ~1705 px on the tester's display. Findings below are based on:

1. Reading the responsive Tailwind classes via `document.querySelectorAll('[class*=grid-cols]')` and similar — the storefront product grid is `grid-cols-2 md:grid-cols-4`, so the cards layout is responsive.
2. The `<aside>` sidebar is `hidden md:block` — on `< md` it collapses behind a toggle button.
3. The `(min-width: 40rem) / 48rem / 64rem / 80rem / 96rem` Tailwind breakpoints are all present.

**Specific mobile risks (inferred from desktop captures + DOM inspection):**

- **No hamburger menu** detected — see 2.20.
- **Filter row on `/products`** is six controls in a flex row with no responsive collapse — see 2.9. On 390 px this will either horizontal-scroll or wrap into 6 stacked rows pushing the grid far below the fold.
- **Cart/checkout summary card** is in a 2-column grid (cart items left, summary right) at `lg:grid-cols-2`. On `< lg` it stacks, which is fine, but the total-clipping (2.8) is a CSS issue, not a layout one — it will reappear in the stacked mobile version too.
- **Admin orders table** (2.18) will horizontal-scroll heavily on mobile. Even with a working hamburger, managing orders from a phone will be painful — which matters for a non-technical seller.
- **Sticky CTA on PDP**: the "THÊM VÀO GIỎ — 590.000 ₫" button is *not* sticky to viewport bottom on mobile (based on its DOM position inside the right column). On mobile it should pin to the bottom of the screen.
- **Bottom-right floating panel** (2.27) collides with the sticky CTA if one is added.

**Recommendation:** before signing off mobile, run the audit again in real Chrome DevTools device mode at 390, 375, and 412 px. The current MCP environment cannot do this.

---

## 5. Admin Review

| Page | State | Notes |
| --- | --- | --- |
| `/admin` | ❌ | Redirects to `/dashboard`, which uses the customer layout and not the admin layout. Empty-state copy is English (2.15). |
| `/admin/products` (via sidebar click) | ⚠ | Real admin layout, four stat cards, working filter row, working table. Names truncated (2.12). Two test products are `Đang bán` (2.13). |
| `/admin/products` (via direct URL or refresh) | ❌ | Lands on `/dashboard` (2.5). |
| `/admin/products/new` | ❌ | 404 (2.5). The actual create flow probably lives behind the "+ THÊM SẢN PHẨM" button — not tested because the button could not be confirmed as an `<a>`. |
| Product create / edit flow | ❓ | Not exercised in this audit to avoid creating noise in production. Inspection notes: admin product table shows `4 size / 3 màu` per row and a `VARIANT` column, suggesting the editor does support variants. The `Thiếu ảnh` badge suggests image upload exists but does not block publish. |
| Image upload | ❓ | Not exercised. The two test products both have a cover image visible in the admin table — so uploads do work at least sometimes. Recent commits (`fix: align product image upload with schema`, `fix: make product image upload fail safely`) suggest this was recently stabilised. |
| `/admin/orders` (via sidebar click) | ✅ | Loads, four stat cards, search + filter + date range, empty state ("Không tìm thấy đơn hàng"). The earlier "Không thể tải đơn hàng" error from the project memory is fixed. |
| `/admin/orders` direct URL | ❌ | Same redirect issue (2.5). |
| `/admin/users` | ❓ | Not exercised. |
| Settings | ❓ | Sidebar has a "Cài đặt" link but it was not opened. |

**Non-technical-seller test:** A non-technical owner could probably (a) open `/admin/products` *if* they bookmark the dashboard then click the sidebar, (b) edit a product if they're given the URL, (c) read orders. But they will be confused by:
- the storefront-shaped `/dashboard` page,
- the truncated names in the product table,
- the leaked admin sidebar appearing on the public storefront when they preview their own shop.

---

## 6. Customer Journey Score (1–10)

| Stage | Score | Why |
| --- | --- | --- |
| First impression | **5** | Solid hero photo and decent typography; killed by the "PHỌNG CÁCH" typo and the leaking admin sidebar when logged in. |
| Product discovery | **5** | Grid is clean, but visible test products and an overflowing filter row drag this down. |
| Product detail confidence | **7** | Material, stock, colour, size, qty, trust strip, size table, related products — most of the right ingredients. Missing inline size guide, no model size reference. |
| Add to cart | **7** | Works, qty stepper works, variant required-before-size copy is good. |
| Checkout | **5** | Form is short and clear, but province free-text + clipped total + no bank info pre-order push this below "OK". |
| Payment clarity | **3** | COD wording is fine. Bank transfer is opaque — no QR, no account, no copy button until success page. |
| Mobile shopping | **4** | Inferred; missing hamburger and overflowing filter bar are real blockers. |
| Trust | **3** | No social, no real hotline, no physical address, no estimated delivery, no order tracking shown. |
| **Overall** | **5/10** | Plumbing exists. Polish and trust elements are missing. |

---

## 7. Recommended Fix Roadmap

### Phase 1 — Critical sales blockers (P0)
- 2.1 Stop the admin sidebar / admin email from leaking onto the storefront.
- 2.2 + 2.13 Hide the two test products from public listing; gate `Đang bán` on having a category and an image.
- 2.3 Fix "PHỌNG CÁCH" → "PHONG CÁCH".
- 2.4 Replace "Đang cập nhật" hotline or remove the row in favour of Zalo/Messenger.
- 2.5 Fix `/admin/products` and `/admin/orders` direct-URL routing; restore `/admin/products/new` (or document the correct create URL).
- 2.6 Show bank-transfer details inline on `/checkout` when "Chuyển khoản" is selected.

### Phase 2 — Admin usability (P1)
- 2.12 Show full product name in the admin table.
- 2.14 Move admin pages into a real admin layout (no public banner, no public footer).
- 2.15 Translate the dashboard empty states.
- 2.16 + 2.17 Translate "all" → "Tất cả"; remove stray `*` from admin order columns.
- 2.18 Slim down the admin orders table or move secondary columns into a row drawer.

### Phase 3 — Storefront conversion (P1–P2)
- 2.7 Replace free-text province/district/ward with cascading selects.
- 2.8 Fix order-summary total clipping.
- 2.9 Make filter row responsive, translate defaults.
- 2.11 Reconcile "Olive" vs "Dust Gray" naming.
- 2.23 Show estimated delivery on PDP/checkout.
- 2.26 + 2.29 + 2.30 Add badges, variant counts, and an inline size-guide trigger.

### Phase 4 — Mobile polish (P1–P2)
- 2.20 Add a real mobile hamburger menu.
- Make the PDP "Thêm vào giỏ" CTA sticky-bottom on `< md`.
- Re-run the audit with real DevTools device mode at 390/375/412.

### Phase 5 — Trust and content (P1–P3)
- 2.21 + 2.22 Real footer with social links, correct column naming.
- 2.27 Hide Vercel toolbar in prod / for non-admins.
- 2.28 Use the RESEY mark in the sidebar header.
- Add About / Lookbook / Drop content so the storefront stops feeling like a Shopify demo with 8 SKUs.

---

## 8. Prompt for Codex

> Use this as the implementation prompt for Codex / a coding assistant. It is phase-based, references the specific issues from this audit, and asks for the same checks CLAUDE.md requires.

```
You are working on RESEY (Next.js App Router + TypeScript + Tailwind + Supabase + Vercel). The codebase rules in CLAUDE.md apply: inspect files first, do not invent Supabase tables/columns, do not delete working features, run npm run lint and npm run build before reporting done. Vietnamese UI; mobile-first.

Read the audit file at RESEY_AUDIT.md before starting.

Work in five PHASES. Each phase, list the files you plan to touch BEFORE editing them. Make minimal safe changes. After each phase, report:
- Files changed
- Root cause
- What you changed
- How to test manually (Vietnamese checklist)
- Whether npm run lint and npm run build passed

PHASE 1 — Critical sales blockers (must land first):
  1. Stop the admin sidebar from rendering on public storefront routes for authenticated users. Audit RESEY_AUDIT.md issue 2.1: the shadcn `<aside class="...md:block">` with QUẢN TRỊ links and the `supermanzero30@gmail.com` widget appears on `/`, `/products`, `/cart`, `/checkout`, `/contact`, `/payment-guide`, `/shipping-policy`, `/return-policy`. Move the admin sidebar into the admin route group's layout only; do NOT show admin nav on storefront routes for any auth state.
  2. Filter the public product list (homepage "Sản phẩm nổi bật" + `/products`) so that products which are draft, lack a category, or lack an image do NOT appear publicly. The admin product table already shows `Thiếu ảnh` and `Chưa phân loại` badges — use whatever existing columns drive those badges (do not invent fields).
  3. Fix the homepage hero typo "PHỌNG CÁCH PHỐ" → "PHONG CÁCH PHỐ". Find the source string (likely in an i18n JSON or the homepage component) and fix it there.
  4. Replace `Hotline: Đang cập nhật` in the footer and on `/contact` with either a real phone number (placeholder OK if owner hasn't provided one — use the env variable `NEXT_PUBLIC_HOTLINE` and read the value from there) OR remove the row and surface a Zalo/Messenger link instead. Do not commit a real phone number unless asked.
  5. Direct URL navigation to `/admin/products` and `/admin/orders` redirects to `/dashboard`. Find the redirect (middleware, layout, or route handler) and make sure refreshing or bookmarking an admin page lands on that page. Also resolve `/admin/products/new` — either implement it as the create form or update the "+ THÊM SẢN PHẨM" button to point at the real route.
  6. On `/checkout`, when the customer selects "CHUYỂN KHOẢN", expand a panel inline that shows bank name, account number, account holder, and the order code format `ORDER-{tempId}`. Pull the bank info from a settings row in Supabase (or env vars if no settings table exists yet — do not invent a table; if you add one, explain the migration first).

PHASE 2 — Admin usability:
  - `/admin/products` table: show the full product name, not a 10-char truncation (RESEY_AUDIT.md issue 2.12).
  - Move admin pages off the storefront layout: no top promo banner, no public footer (issue 2.14).
  - Translate dashboard empty states to Vietnamese (issue 2.15).
  - Replace "all" default with "Tất cả" in `/admin/orders` filter (issue 2.16).
  - Remove stray `*` from "ĐỊA CHỈ CHI TIẾT (SỐ NHÀ, TÊN ĐƯỜNG)*" column header (issue 2.17).
  - Trim or restructure `/admin/orders` table so it fits at 1280 px desktop without horizontal scroll (issue 2.18).

PHASE 3 — Storefront conversion:
  - `/checkout`: replace `Tỉnh/Thành phố`, `Quận/Huyện`, `Phường/Xã` text inputs with cascading selects driven by the GSO/dvhcvn dataset. Store both the human label and the code (issue 2.7).
  - Fix order-summary card so "Tổng cộng" and "Phí vận chuyển" don't clip at any desktop width (issue 2.8).
  - `/products` filter row: translate `all` defaults, change `default` sort label to Vietnamese, collapse the row into a bottom-sheet on `< md` (issue 2.9).
  - Reconcile "RESEY Washed Tee – Olive" vs colour label "Dust Gray" (issue 2.11) — fix in admin data, not by hiding the mismatch in UI.

PHASE 4 — Mobile polish:
  - Add a mobile hamburger that hides the inline nav on `< md` and opens an off-canvas sheet (issue 2.20).
  - Make PDP "Thêm vào giỏ" CTA sticky to viewport bottom on `< md`.
  - Re-test at 390 / 375 / 412 px in Chrome DevTools device mode.

PHASE 5 — Trust and content:
  - Footer: add Instagram, TikTok, Zalo links (issue 2.22). Rename "Hệ thống cửa hàng" to "Kênh bán hàng" or fill it with real addresses (issue 2.21).
  - Hide Vercel toolbar in production for non-admin users (issue 2.27).
  - Replace the generic "E" avatar in the admin sidebar with the RESEY R-mark (issue 2.28).

After each phase, do not move on until npm run lint and npm run build pass. If a phase touches Supabase queries, also explain the Supabase impact (which table/column, RLS implications) before changing it.

Do not redesign the whole site. Do not commit. Open a feature branch per phase using the suggested branch names in CLAUDE.md §18.
```

---

*End of report.*
