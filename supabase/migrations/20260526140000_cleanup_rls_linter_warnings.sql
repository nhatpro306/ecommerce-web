-- Follow-up cleanup after applying the 2026-05-25 cart/admin RLS migration.
-- Safe operations only: policy rewrites, EXECUTE revokes, and duplicate index drops.

-- Public RPC access is not needed. RLS policies use private.is_admin().
revoke execute on function public.is_admin() from public, anon, authenticated;
revoke execute on function public.is_admin(uuid) from public, anon, authenticated;

-- Rebuild cart policies with init-plan cached auth calls and a single admin SELECT policy.
drop policy if exists "carts_select_own" on public.carts;
drop policy if exists "carts_insert_own" on public.carts;
drop policy if exists "carts_update_own" on public.carts;
drop policy if exists "carts_delete_own" on public.carts;
drop policy if exists "carts_admin_read" on public.carts;
drop policy if exists "carts_admin_read_all" on public.carts;

create policy "carts_select_own"
  on public.carts for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "carts_insert_own"
  on public.carts for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "carts_update_own"
  on public.carts for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "carts_delete_own"
  on public.carts for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy "carts_admin_read"
  on public.carts for select
  to authenticated
  using ((select private.is_admin((select auth.uid()))));

-- Rebuild cart item policies with init-plan cached auth calls.
drop policy if exists "cart_items_select_own" on public.cart_items;
drop policy if exists "cart_items_insert_own" on public.cart_items;
drop policy if exists "cart_items_update_own" on public.cart_items;
drop policy if exists "cart_items_delete_own" on public.cart_items;

create policy "cart_items_select_own"
  on public.cart_items for select
  to authenticated
  using (
    exists (
      select 1
      from public.carts c
      where c.id = cart_items.cart_id
        and c.user_id = (select auth.uid())
    )
  );

create policy "cart_items_insert_own"
  on public.cart_items for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.carts c
      where c.id = cart_items.cart_id
        and c.user_id = (select auth.uid())
    )
  );

create policy "cart_items_update_own"
  on public.cart_items for update
  to authenticated
  using (
    exists (
      select 1
      from public.carts c
      where c.id = cart_items.cart_id
        and c.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.carts c
      where c.id = cart_items.cart_id
        and c.user_id = (select auth.uid())
    )
  );

create policy "cart_items_delete_own"
  on public.cart_items for delete
  to authenticated
  using (
    exists (
      select 1
      from public.carts c
      where c.id = cart_items.cart_id
        and c.user_id = (select auth.uid())
    )
  );

-- Remove duplicate permissive SELECT policies; keep the stricter admin-aware ones.
drop policy if exists "product_images_read_active" on public.product_images;
drop policy if exists "product_variants_read_active" on public.product_variants;
drop policy if exists "store_settings_read_all" on public.store_settings;

-- Public reviews are already covered by reviews_read_all. Split owner writes so
-- the owner policy no longer contributes another permissive SELECT policy.
drop policy if exists "reviews_own_write" on public.reviews;

create policy "reviews_insert_own"
  on public.reviews for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "reviews_update_own"
  on public.reviews for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "reviews_delete_own"
  on public.reviews for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- product-images is a public bucket; public object URLs do not need a broad
-- storage.objects SELECT policy that also permits listing.
drop policy if exists "Public can view product images" on storage.objects;
drop policy if exists "product_images_storage_public_read" on storage.objects;

-- Drop legacy storage policies that call public.is_admin(); the profiles-based
-- "Admins can ..." policies remain in place for upload/update/delete.
drop policy if exists "product_images_storage_admin_insert" on storage.objects;
drop policy if exists "product_images_storage_admin_update" on storage.objects;
drop policy if exists "product_images_storage_admin_delete" on storage.objects;

-- Remove duplicate indexes reported by Supabase advisors. These are redundant
-- with older indexes created by the base schema/bootstrap migrations.
drop index if exists public.idx_cart_items_cart_id;
drop index if exists public.idx_order_items_order_id;
drop index if exists public.idx_order_items_product_id;
drop index if exists public.idx_orders_user_id;
drop index if exists public.idx_product_images_product_id;
drop index if exists public.uniq_product_images_one_primary;
drop index if exists public.idx_product_variants_product_id;
drop index if exists public.idx_products_category_id;
drop index if exists public.idx_products_slug_unique;
drop index if exists public.idx_reviews_product_id;
