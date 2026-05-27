-- =============================================================
-- 2026-05-26 — RLS init-plan caching for private.is_admin()
--
-- Problem:
--   Existing admin RLS policies use:
--       using (is_active = true or private.is_admin((select auth.uid())))
--
--   The (select auth.uid()) is init-plan cached (good), but
--   private.is_admin(uuid) itself is STABLE — Postgres evaluates
--   it once per row when called directly in a USING clause.
--   On a SELECT scan of products with thousands of rows, this
--   means thousands of profile lookups, even though the answer
--   is the same for the whole query.
--
--   Result: admin SELECTs that scan all products run for 25+s
--   and trip the client timeout.
--
-- Fix:
--   Wrap private.is_admin(...) in an outer (select ...) so the
--   planner builds an InitPlan: the function is evaluated once
--   per query, result reused for every row.
--
--   New form:
--       using (is_active = true or (select private.is_admin((select auth.uid()))))
--
-- This migration is idempotent and safe to re-run.
-- =============================================================


-- ------------------------------------------------------------
-- products
-- ------------------------------------------------------------

drop policy if exists "products_read_active"   on public.products;
drop policy if exists "products_admin_insert"  on public.products;
drop policy if exists "products_admin_update"  on public.products;
drop policy if exists "products_admin_delete"  on public.products;

create policy "products_read_active" on public.products
for select
using (
  is_active = true
  or (select private.is_admin((select auth.uid())))
);

create policy "products_admin_insert" on public.products
for insert
with check ((select private.is_admin((select auth.uid()))));

create policy "products_admin_update" on public.products
for update
using ((select private.is_admin((select auth.uid()))))
with check ((select private.is_admin((select auth.uid()))));

create policy "products_admin_delete" on public.products
for delete
using ((select private.is_admin((select auth.uid()))));


-- ------------------------------------------------------------
-- categories
-- ------------------------------------------------------------

drop policy if exists "categories_admin_insert" on public.categories;
drop policy if exists "categories_admin_update" on public.categories;
drop policy if exists "categories_admin_delete" on public.categories;

create policy "categories_admin_insert" on public.categories
for insert
with check ((select private.is_admin((select auth.uid()))));

create policy "categories_admin_update" on public.categories
for update
using ((select private.is_admin((select auth.uid()))))
with check ((select private.is_admin((select auth.uid()))));

create policy "categories_admin_delete" on public.categories
for delete
using ((select private.is_admin((select auth.uid()))));


-- ------------------------------------------------------------
-- store_settings
-- ------------------------------------------------------------

drop policy if exists "store_settings_admin_insert" on public.store_settings;
drop policy if exists "store_settings_admin_update" on public.store_settings;
drop policy if exists "store_settings_admin_delete" on public.store_settings;

create policy "store_settings_admin_insert" on public.store_settings
for insert
with check ((select private.is_admin((select auth.uid()))));

create policy "store_settings_admin_update" on public.store_settings
for update
using ((select private.is_admin((select auth.uid()))))
with check ((select private.is_admin((select auth.uid()))));

create policy "store_settings_admin_delete" on public.store_settings
for delete
using ((select private.is_admin((select auth.uid()))));


-- ------------------------------------------------------------
-- product_images
-- ------------------------------------------------------------

drop policy if exists "product_images_public_read"   on public.product_images;
drop policy if exists "product_images_admin_insert"  on public.product_images;
drop policy if exists "product_images_admin_update"  on public.product_images;
drop policy if exists "product_images_admin_delete"  on public.product_images;

create policy "product_images_public_read" on public.product_images
for select
using (
  exists (
    select 1
    from public.products p
    where p.product_id = product_images.product_id
      and (p.is_active = true or (select private.is_admin((select auth.uid()))))
  )
);

create policy "product_images_admin_insert" on public.product_images
for insert
with check ((select private.is_admin((select auth.uid()))));

create policy "product_images_admin_update" on public.product_images
for update
using ((select private.is_admin((select auth.uid()))))
with check ((select private.is_admin((select auth.uid()))));

create policy "product_images_admin_delete" on public.product_images
for delete
using ((select private.is_admin((select auth.uid()))));


-- ------------------------------------------------------------
-- product_variants
-- ------------------------------------------------------------

drop policy if exists "product_variants_public_read"  on public.product_variants;
drop policy if exists "product_variants_admin_insert" on public.product_variants;
drop policy if exists "product_variants_admin_update" on public.product_variants;
drop policy if exists "product_variants_admin_delete" on public.product_variants;

create policy "product_variants_public_read" on public.product_variants
for select
using (
  exists (
    select 1
    from public.products p
    where p.product_id = product_variants.product_id
      and p.is_active = true
  )
  or (select private.is_admin((select auth.uid())))
);

create policy "product_variants_admin_insert" on public.product_variants
for insert
with check ((select private.is_admin((select auth.uid()))));

create policy "product_variants_admin_update" on public.product_variants
for update
using ((select private.is_admin((select auth.uid()))))
with check ((select private.is_admin((select auth.uid()))));

create policy "product_variants_admin_delete" on public.product_variants
for delete
using ((select private.is_admin((select auth.uid()))));
