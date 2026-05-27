-- Final migration after the legacy short-version 20260525 migration.
-- That migration can be re-applied by Supabase history drift and recreate
-- policies that call public.is_admin() plus duplicate indexes. This file must
-- sort after the 2026052614xxxx cleanup migrations.

-- Carts: one owner/admin SELECT policy, owner-only writes.
drop policy if exists "carts_select_own" on public.carts;
drop policy if exists "carts_admin_read" on public.carts;
drop policy if exists "carts_admin_read_all" on public.carts;
drop policy if exists "carts_select_own_or_admin" on public.carts;
drop policy if exists "carts_insert_own" on public.carts;
drop policy if exists "carts_update_own" on public.carts;
drop policy if exists "carts_delete_own" on public.carts;

create policy "carts_select_own_or_admin"
  on public.carts for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_admin((select auth.uid())))
  );

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

-- Cart items: user can only touch items inside their own cart.
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

-- Product images: remove legacy public.is_admin() policies if the old migration
-- was replayed, then keep private.is_admin() admin writes.
drop policy if exists "product_images_admin_insert" on public.product_images;
drop policy if exists "product_images_admin_update" on public.product_images;
drop policy if exists "product_images_admin_delete" on public.product_images;
drop policy if exists "product_images_admin_all" on public.product_images;
drop policy if exists "product_images_admin_write" on public.product_images;

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

-- Older migrations create duplicate indexes under different names.
drop index if exists public.idx_cart_items_cart_id;
drop index if exists public.idx_product_images_product_id;
drop index if exists public.idx_products_category_id;

-- Do not expose public.is_admin() as a client-callable RPC.
revoke execute on function public.is_admin() from public, anon, authenticated;
