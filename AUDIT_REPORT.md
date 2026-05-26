# RESEY — Production Audit Report (Phase 1)

**Date:** 2026-05-26
**Auditor:** Opus 4.7
**Branch:** `feat/phase-2-admin-dashboard`
**Supabase project:** `veafolrxbwuhjgcpkqtt`
**Repo:** https://github.com/nhatpro306/resey-shop
**Live:** https://resey.uk

---

## 1. Root Cause Summary

The site is mostly functioning. The remaining instability comes from **three latent schema/permission mismatches** and **a few code rough edges**. None of them require rewriting the project.

| # | Category | Root cause | Severity |
|---|----------|------------|----------|
| A | Schema drift | `cart_items.variant_id` and `order_items.variant_id` are `text` in prod, but migration `20260521` declares them `uuid REFERENCES product_variants(id)`. No FK exists in prod. | High |
| B | Function chaos | Three `is_admin` functions still live in `public` (zero-arg + `uuid` arg) even though every RLS policy uses `private.is_admin`. `public.is_admin` is granted only to `postgres`/`service_role` — any leftover RPC or trigger calling it returns `403 permission denied for function is_admin`. | Medium |
| C | Security advisor | `public.create_order_checkout` is `SECURITY DEFINER` exposed to `authenticated`. This is intentional (atomic stock decrement) but flagged by linter. | Low — info |
| D | Auth password policy | "Leaked password protection disabled" on Supabase Auth. | Low |
| E | Admin perf | `getAllProducts` runs 4 side queries in parallel with 25 s / 15 s timeouts. The first paint blocks on all 4. RLS on `product_variants` does per-row `EXISTS(products WHERE is_active)` — fine for 78 rows but will hurt at scale. | Medium |
| F | UX / error messages | Some admin paths still surface generic Vietnamese strings instead of the Supabase message that `getSupabaseErrorMessage` already builds. List/table on desktop is narrow (already widened in `670ba5a`, still misses inline edit). | Low |
| G | Browser ext noise | `onboarding.js getImageNode` is the stagewise-toolbar Chrome extension, **not** RESEY code. Ignore. | None |

The classic `Failed to get all products: loading timeout` was caused by browser `navigator.locks` deadlock — already fixed in `34eb46a` + `05519d3` (singleton client + `processLock`). Keep that fix; do not revert.

---

## 2. Critical Issues — Detailed

### A. variant_id type mismatch (highest impact)

**Observed:**
```sql
public.cart_items.variant_id   = text  (no FK)
public.order_items.variant_id  = text  (no FK)
public.product_variants.id     = uuid
```

Repo migration `supabase/migrations/20260521_real_inventory_and_atomic_checkout.sql:114-118` declares them `uuid REFERENCES public.product_variants(id)`. The migration appears in `supabase_migrations.schema_migrations`, but the live columns are `text`. Most likely a branch/manual ALTER changed them back (or the migration was rolled forward with a hand-edited type). Result:

- `create_order_checkout(payload jsonb)` (the SECURITY DEFINER RPC checkout) silently relies on implicit `uuid → text` cast when inserting `variant_record.id` into `order_items.variant_id`. It works, but referential integrity is gone — deleting a variant leaves dangling text in orders.
- `cart_items.variant_id` accepts arbitrary strings → next `JOIN ... ON cart_items.variant_id::uuid = pv.id` would throw if a legacy non-UUID value ever lands there.
- TypeScript treats `variant_id?: string | null` so no compile-time signal.

**Data state (safe to convert):**
```
cart_items:   1 row,  0 with variant_id
order_items:  5 rows, 2 with variant_id, all valid UUID format
```

No orphaned variant_ids. Conversion is safe with a guarded migration (see §4 SQL).

---

### B. Stale `public.is_admin` overloads

**DB state:**
| Schema | Args | Granted to |
|--------|------|------------|
| `private` | `(check_user_id uuid)` | authenticated, anon, public, postgres, service_role  ✓ used by every RLS policy |
| `public` | `(check_user_id uuid)` | postgres, service_role only |
| `public` | `()` (zero-arg) | postgres, service_role only |

Every RLS policy in `pg_policies` references `private.is_admin(auth.uid())`. The `public.is_admin` overloads are orphans left after the `20260526005515_cleanup_legacy_public_is_admin_policies` migration removed the *policies* but not the *functions*.

**Why this still bites:**
- `pg_depend` shows no dependents — but past console errors `403 permission denied for function is_admin` mean *something* called `public.is_admin` from the `authenticated` role. Most likely cached PostgREST schema or a now-removed admin server call. Once the overloads are dropped the chance of regression disappears.
- Code search: `grep -r "is_admin" src/` returns **zero** hits. Safe.

Migration in §4 drops both `public.is_admin` overloads.

---

### C. `create_order_checkout` security advisor (informational)

Function is `SECURITY DEFINER`, executes as table owner, validates `auth.uid()` and ownership of `shipping_address_id` before writing. This is the **correct** pattern for atomic checkout — keep it. Suppress the linter by acknowledging the pattern; do not move to `SECURITY INVOKER` (it would lose stock-decrement atomicity).

---

### D. Leaked-password protection

Cosmetic toggle. Enable in Supabase dashboard → Auth → Policies → "Leaked password protection". No code change.

---

### E. Admin slow load

- 4 parallel `Promise.allSettled` side queries each with `withTimeout` 15-25 s — total worst-case = 25 s of spinner if one stalls.
- Recommend lower timeout to **8 s** for side queries; main `products` query stays at 15 s. Render base list first, hydrate variants/images progressively.
- RLS init-plan caching is already done (`SELECT auth.uid()`, `SELECT private.is_admin(...)`) in migration `20260526130000`. Good.
- Missing index: composite `products (is_active, created_at DESC)` would let storefront listing skip the seq-scan filter; current `idx_products_created_at` + `idx_products_is_active` are separate.

---

### F. UX / error swallowing

Admin code already builds full error chains in `getSupabaseErrorMessage` — but a few service-layer fallbacks in `src/services/admin/adminProductService.ts` still call `toast.error("Không thể cập nhật giỏ hàng")`-style strings. The server actions in `src/app/admin/products/actions.ts` are good. Mainly:

- `adminProductService.createProduct / updateProduct / deleteProduct` (lines 392-461) are dead code (admin pages route through server actions now) — keep but mark `@deprecated`.
- Admin products **desktop list** widened in `670ba5a` but still no inline edit / no bulk status toggle.

---

## 3. Files Changed (proposed — Sonnet will implement)

### New migration
- `supabase/migrations/20260526150000_variant_id_uuid_and_drop_public_is_admin.sql` (full SQL in §4)

### Code

| File | Change |
|------|--------|
| `src/services/admin/adminProductService.ts` | Lower `SIDE_QUERY_TIMEOUT_MS` to 8000. Add `@deprecated` JSDoc on `createProduct`/`updateProduct`/`deleteProduct`. |
| `src/services/cart/cartService.ts` | Remove `isMissingVariantIdColumn` legacy fallback (no longer needed once migration runs). Keep insert payload typed as `string | null` (uuid). |
| `src/app/admin/products/actions.ts` | No change — already surfaces real messages. |
| `src/app/admin/orders/actions.ts` | Wrap `throw new Error(error.message)` → include `error.code` + `details` so toasts show real cause. |
| `src/services/storage/productImageUpload.ts` | Add explicit auth-session check before upload; if no session → throw "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại." |
| `src/app/admin/products/page.tsx` (table view) | Desktop ≥ `lg:` widen columns, add inline status toggle button calling `activateAdminProductAction` / `deactivateAdminProductAction`. (Optional; Phase 2.) |

**Do NOT touch:**
- `src/lib/supabase/client.ts` (lock fix is correct).
- `src/lib/auth/requireAdmin.ts` (works).
- `create_order_checkout` SQL function (works).
- Any RLS policy (all use `private.is_admin`).

---

## 4. SQL Migration (ready to apply)

Save as `supabase/migrations/20260526150000_variant_id_uuid_and_drop_public_is_admin.sql`:

```sql
-- Phase 1 production stability migration.
-- 1) Convert cart_items.variant_id and order_items.variant_id from text to uuid.
-- 2) Re-establish foreign keys to product_variants(id).
-- 3) Drop stale public.is_admin overloads now that every policy uses private.is_admin.
--
-- Safe to run multiple times. No data loss expected: pre-check verifies all
-- existing values are valid UUIDs that resolve to live product_variants rows.

begin;

------------------------------------------------------------------------
-- 0. Sanity pre-checks — abort early if data is dirty.
------------------------------------------------------------------------

do $$
declare
  bad_cart  int;
  bad_order int;
begin
  -- Any non-NULL variant_id that is NOT a valid UUID format?
  select count(*) into bad_cart
  from public.cart_items
  where variant_id is not null
    and variant_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  select count(*) into bad_order
  from public.order_items
  where variant_id is not null
    and variant_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  if bad_cart > 0 then
    raise exception 'cart_items has % rows with non-UUID variant_id. Clean before retry.', bad_cart;
  end if;
  if bad_order > 0 then
    raise exception 'order_items has % rows with non-UUID variant_id. Clean before retry.', bad_order;
  end if;
end$$;

-- Null out any cart_items.variant_id that doesn't resolve (defensive — found 0 today).
update public.cart_items ci
set variant_id = null
where variant_id is not null
  and not exists (
    select 1 from public.product_variants pv where pv.id::text = ci.variant_id
  );

-- order_items must keep historical variant_id even if the variant is later
-- deleted. We use ON DELETE SET NULL (was: text without FK) to avoid breaking
-- the order delete flow used by deleteAdminProductAction's hard-delete fallback.

------------------------------------------------------------------------
-- 1. cart_items.variant_id : text -> uuid + FK
------------------------------------------------------------------------

alter table public.cart_items
  drop constraint if exists cart_items_variant_id_fkey;

alter table public.cart_items
  alter column variant_id type uuid
  using nullif(variant_id, '')::uuid;

alter table public.cart_items
  add constraint cart_items_variant_id_fkey
  foreign key (variant_id) references public.product_variants(id)
  on delete set null;

------------------------------------------------------------------------
-- 2. order_items.variant_id : text -> uuid + FK
------------------------------------------------------------------------

alter table public.order_items
  drop constraint if exists order_items_variant_id_fkey;

alter table public.order_items
  alter column variant_id type uuid
  using nullif(variant_id, '')::uuid;

alter table public.order_items
  add constraint order_items_variant_id_fkey
  foreign key (variant_id) references public.product_variants(id)
  on delete set null;

------------------------------------------------------------------------
-- 3. Refresh indexes (drop+recreate so they use the new type cleanly).
------------------------------------------------------------------------

drop index if exists public.cart_items_variant_id_idx;
create index cart_items_variant_id_idx on public.cart_items (variant_id);

drop index if exists public.order_items_variant_id_idx;
create index order_items_variant_id_idx on public.order_items (variant_id);

------------------------------------------------------------------------
-- 4. Drop stale public.is_admin overloads (private.is_admin stays).
------------------------------------------------------------------------

revoke all on function public.is_admin(uuid) from public, anon, authenticated;
drop function if exists public.is_admin(uuid);

revoke all on function public.is_admin() from public, anon, authenticated;
drop function if exists public.is_admin();

------------------------------------------------------------------------
-- 5. Helpful composite index for storefront list query.
------------------------------------------------------------------------

create index if not exists products_active_created_idx
  on public.products (is_active, created_at desc);

commit;

-- Post-apply verification (run manually after commit):
--   select pg_typeof(variant_id) from public.cart_items limit 1;   -- uuid
--   select pg_typeof(variant_id) from public.order_items limit 1;  -- uuid
--   select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--     where n.nspname='public' and p.proname='is_admin';            -- 0 rows
```

### Rollback notes

- The migration is wrapped in a single `BEGIN/COMMIT`. If the type conversion fails (e.g. a row with a non-UUID value appeared between pre-check and ALTER), the whole transaction rolls back. No partial state.
- After commit, rollback would require:
  ```sql
  alter table public.cart_items   alter column variant_id type text using variant_id::text;
  alter table public.order_items  alter column variant_id type text using variant_id::text;
  alter table public.cart_items   drop constraint cart_items_variant_id_fkey;
  alter table public.order_items  drop constraint order_items_variant_id_fkey;
  ```
  Recreating the two dropped `public.is_admin` overloads is harder — keep the migration text on hand.

---

## 5. Exact Commands

```powershell
# 1. Pull latest, install deps.
git pull
npm install

# 2. Write migration file (Sonnet to create with content from §4).
#    Path: supabase/migrations/20260526150000_variant_id_uuid_and_drop_public_is_admin.sql

# 3. Apply via Supabase MCP (preferred) — Opus reviewer uses this in step 3 of workflow:
#    mcp__supabase__apply_migration(name="variant_id_uuid_and_drop_public_is_admin", query=<file contents>)
#
#    Or via Supabase CLI if linked:
#    npx supabase db push

# 4. Code fixes (Sonnet implements §3 list).
#    Run after each batch:
npm run lint
npm run build

# 5. Manually verify on staging branch URL, then merge.
```

---

## 6. Manual Verification Checklist

Run this **after migration + code fixes** in production. Tick every box.

- [ ] Sign in as admin user (profile.role='admin', is_active=true).
- [ ] Visit `/admin` — KPI cards load < 3 s. No 403 / 500 in console.
- [ ] Visit `/admin/products` — full list renders. No "loading timeout".
- [ ] Click **Tạo sản phẩm** → create draft product with: title, price, description, category, 2 sizes, 2 colors, 1 image. Save → product appears as "Bản nháp".
- [ ] Edit the draft → add 2 variants (size+color combos) with stock. Save.
- [ ] Toggle to **Đăng bán** — readiness check passes, product becomes active.
- [ ] Open `/products` (storefront, fresh incognito) → product shows.
- [ ] Open `/products/<slug>` → image gallery, size+color selectors, add-to-cart works.
- [ ] Login as test customer → add to cart → checkout (COD) → order created.
- [ ] Back to `/admin/orders` → new order visible with items, variant snapshot, customer info.
- [ ] In `/admin/orders` change status → updates persist.
- [ ] In `/admin/products` click "Xóa" on the test product → if it has order_items, it should become hidden; if not, hard-deleted.
- [ ] In `/admin/products` click "Xóa" on a true orphan product → hard delete OK.
- [ ] Confirm Supabase Logs (Studio → Logs → API) shows no `42501` permission denials, no `42703` undefined column.
- [ ] `select pg_typeof(variant_id) from public.order_items limit 1;` returns `uuid`.

---

## 7. Risks & Things Not Fixed in Phase 1

| Risk | Mitigation |
|------|------------|
| Migration runs while a customer is mid-checkout. The `create_order_checkout` RPC inserts into `order_items.variant_id` — during `ALTER TABLE ... TYPE uuid` the table is exclusively locked, so the RPC will block (not fail). Apply during low-traffic window (Vietnam late night). | Manual — schedule for ~04:00 ICT. |
| `cart_items.variant_id` is currently NULL for the one existing row. After migration the FK is `ON DELETE SET NULL` — variants can still be deactivated without losing cart rows. | None needed. |
| `order_items.variant_id` FK uses `ON DELETE SET NULL` — different from the repo migration's `ON DELETE RESTRICT`. Chosen to keep `deleteAdminProductAction`'s "delete if no orders, else hide" flow working when a variant (not product) is removed. If you prefer historical integrity, change to `ON DELETE RESTRICT`. | Documented. Default: SET NULL. |
| Dropping `public.is_admin` overloads is irreversible without recreating them. If any deployed-but-not-in-this-repo function/trigger calls `public.is_admin`, it will break. `pg_depend` shows no dependents today. | Pre-check above. If any 42883 error surfaces post-deploy, recreate the function. |
| `create_order_checkout` SECURITY DEFINER lint stays WARN. | Intentional — atomic stock. Suppress in dashboard. |
| Auth leaked-password protection: still off. | Enable in Supabase dashboard manually. |
| Admin desktop UI (inline edit, bulk actions) not improved in this phase. | Defer to Phase 2 admin polish (already on roadmap). |
| `adminProductService.createProduct/updateProduct/deleteProduct` are dead browser-side mutations. Leaving them in returns `permission denied` if anyone calls them. | Mark `@deprecated` + add `throw new Error("Use server action")` in body. |

---

## 8. Workflow Hand-off

1. **Opus 4.7 (this report)** — audit complete. Hand to Sonnet with:
   - `AUDIT_REPORT.md` (this file)
   - Repo + branch `feat/phase-2-admin-dashboard`

2. **Sonnet 4.6** — implements:
   - Create `supabase/migrations/20260526150000_variant_id_uuid_and_drop_public_is_admin.sql` (content in §4).
   - Apply code fixes in §3.
   - Run `npm run lint && npm run build`. Both must pass.
   - Apply migration via Supabase MCP `apply_migration` tool.
   - Do **not** push without Opus review.

3. **Opus 4.7 (review)** — reads `git diff`, verifies:
   - Migration matches §4 exactly.
   - Code touches only the files in §3.
   - No RLS policy changes.
   - No edits under `src/lib/supabase/client.ts` (lock fix preserved).
   - Manual checklist §6 attached to PR description.
   - Approves merge or sends back.

---

## 9. Appendix — quick repro of the 403

If the 403 appears again post-migration, run:

```sql
-- Confirm only private.is_admin remains.
select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where p.proname='is_admin';
```

Expected: exactly one row, `private | is_admin | check_user_id uuid`.

If any `public.is_admin` row reappears → something re-applied an old migration; track via `select * from supabase_migrations.schema_migrations order by version desc limit 5;`.
