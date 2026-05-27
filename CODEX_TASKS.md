# CODEX TASKS — RESEY Admin Dashboard

Branch: `feat/phase-2-admin-dashboard`
Last commit: `730c2fc`
Date: 2026-05-26

---

## 0. URGENT — SECURITY (do FIRST)

Commit `256aa4d` on GitHub leaked `.env.vercel` containing:

- `SUPABASE_SERVICE_ROLE_KEY` (CRITICAL — bypasses all RLS)
- `NEXT_PUBLIC_BANK_ACCOUNT_NUMBER` / `BANK_ACCOUNT_NAME` / `BANK_NAME`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (less critical, public anyway)

### Tasks

1. **Rotate `SUPABASE_SERVICE_ROLE_KEY`**
   - Supabase Dashboard → Settings → API → Reset `service_role` key
   - Confirm with user before rotation (will invalidate any server using old key)

2. **Update key in deployment**
   - Vercel Dashboard → Project → Settings → Environment Variables
   - Replace `SUPABASE_SERVICE_ROLE_KEY` value
   - Redeploy

3. **Update local `.env.vercel`**
   - Replace key locally (file is now gitignored, won't re-leak)

4. **Optional — scrub git history**
   - Discuss with user first.
   - Options: `git filter-repo --path .env.vercel --invert-paths` then force-push
   - Or accept that key is rotated → history compromise is moot

5. **Audit other secrets** in `.env.vercel` — decide which need rotation (bank info likely safe; storefront already shows it publicly)

---

## 1. Verify migrations applied on Supabase production

Three new migrations added recently — confirm they ran:

```
supabase/migrations/20260526000000_fix_private_is_admin_and_indexes.sql
supabase/migrations/20260526120000_security_lint_fixes.sql
supabase/migrations/20260526130000_rls_initplan_cache_isadmin.sql
```

### How to verify

- `supabase db push` (if using CLI linked to project)
- Or Dashboard → Database → Migrations → confirm timestamps
- Run query to confirm RLS policies updated:

```sql
select policyname, qual
from pg_policies
where schemaname = 'public'
  and tablename = 'products'
  and policyname = 'products_read_active';
```

Expected `qual`: `is_active = true OR (SELECT private.is_admin((SELECT auth.uid())))`

If old form `private.is_admin((select auth.uid()))` (no outer select wrap) → migration didn't run, re-apply.

---

## 2. Manual test — admin loads under timeout

After migrations applied:

- Sign in as admin → open `/admin`
  - Dashboard KPIs render within 5s
  - No `[adminProductService.getAllProducts] failed` in console
  - Console shows `[adminProductService.getAllProducts] base products loaded { count, durationMs }` — durationMs should be < 3000

- Open `/admin/products`
  - Products list renders
  - Loading skeleton shows briefly, then table
  - No timeout error toast

- If still timing out (>15s):
  - Open Supabase Dashboard → Database → Query Performance
  - Check slow queries on `products` table
  - Inspect EXPLAIN of `SELECT * FROM products` as admin role
  - Likely culprit: large dataset + missing index, or cold DB (paused)

---

## 3. Remaining Supabase linter warnings

Still WARN level — fix if time allows:

### 3a. `public_bucket_allows_listing` on `product-images`

Remaining policy `"Public can view product images"` is still broad SELECT. To eliminate listing:

- Option A: switch to access by direct object URL only (Supabase public bucket setting handles this, no RLS needed for object reads)
- Option B: tighten policy:
  ```sql
  drop policy if exists "Public can view product images" on storage.objects;
  create policy "Public can view product images"
    on storage.objects for select
    using (bucket_id = 'product-images' and name is not null);
  ```
  Note: this still allows listing technically; cleanest fix is to make bucket public via dashboard and remove the RLS policy.

### 3b. `auth_leaked_password_protection`

Dashboard-only:

- Supabase Dashboard → Authentication → Providers → Email → toggle **Leaked Password Protection** ON

### 3c. `create_order_checkout` (authenticated SECURITY DEFINER)

Intentional — keep as-is. Authenticated users must call this to checkout.

If you want to suppress the warning: function must stay SECURITY DEFINER (it bypasses RLS to write orders + decrement stock atomically). Accept the warning.

---

## 4. Code quality follow-up (optional)

### 4a. `useAdmin.ts` doesn't use `is_admin()` RPC — good

Since we revoked anon/authenticated EXECUTE on `public.is_admin()`, the hook still works because it queries `admin_users` view and `profiles` table directly. No code change needed.

### 4b. Audit other callsites of `withTimeout`

```
src/services/cart/cartService.ts
src/services/category/categoryService.ts
src/services/product/productService.ts
src/services/product/productServerService.ts
src/components/SiteFooter.tsx
```

Verify their timeout values are reasonable (≥15s) and error messages are user-friendly Vietnamese. Don't refactor unless they show similar timeout-in-production behavior.

### 4c. `onboarding.js` error in console

Not in source code. It's a browser extension (Edge Shopping / similar). Document in README that this is expected and unrelated.

---

## 5. PR

PR for branch already in compare state:
https://github.com/nhatpro306/resey-shop/compare/main...feat/phase-2-admin-dashboard?expand=1

Before merging:

- [ ] Section 0 (security) complete
- [ ] Section 1 (migrations applied) verified on production Supabase
- [ ] Section 2 (manual test) admin loads within timeout
- [ ] Reviewer eyeballs `20260526130000_rls_initplan_cache_isadmin.sql` — confirms init-plan wrap pattern is the supabase-recommended form

---

## Files changed in this branch (high-level)

```
src/utils/withTimeout.ts                          — timeout logs elapsed sec
src/services/admin/adminProductService.ts         — split joins, allSettled side queries, 25s timeout
src/app/admin/AdminDashboardClient.tsx            — allSettled fetch + inline error banners + retry
src/app/admin/products/page.tsx                   — error card + retry button + loading message
supabase/migrations/20260526120000_security_lint_fixes.sql
supabase/migrations/20260526130000_rls_initplan_cache_isadmin.sql
.gitignore                                        — added .env.vercel
```

## Known good state

- `npm run lint` ✅
- `npm run build` ✅ (Next 16.2.2, 30 pages)
- TypeScript ✅
- Migrations syntactically valid (idempotent, safe to re-run)

## What Codex should NOT do

- Do NOT add `SUPABASE_SERVICE_ROLE_KEY` to any client-bundled code (`src/lib/supabase/client.ts`, anything imported by a `"use client"` file).
- Do NOT redesign admin UI in this branch — scope is fetch/perf/security fixes.
- Do NOT skip the migration verification step (#1) — without migrations applied, the perf fix has no effect and admin will still timeout.
- Do NOT commit `.env*` files. Use `git add <specific files>` instead of `git add -A`.
- Do NOT force-push without explicit user approval.
