-- Repair cart/admin RLS without disabling RLS or exposing service-role access.
-- Root goal:
-- - own cart/cart_items reads/writes must not depend on admin helper checks
-- - admin catalog reads/writes keep using the private admin helper
-- - duplicate permissive product/image policies from older migrations are removed

create schema if not exists private;

create or replace function public.is_admin(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    exists (
      select 1
      from public.profiles
      where profile_id = check_user_id
        and role = 'admin'
        and is_active = true
    ),
    false
  );
$$;

grant execute on function public.is_admin(uuid) to anon, authenticated, service_role;

create or replace function private.is_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_admin(user_id);
$$;

grant usage on schema private to anon, authenticated, service_role;
grant execute on function private.is_admin(uuid) to anon, authenticated, service_role;

drop policy if exists "carts_own_all" on public.carts;
drop policy if exists "carts_admin_all" on public.carts;

create policy "carts_own_all"
on public.carts
for all
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "carts_admin_all"
on public.carts
for all
using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));

drop policy if exists "cart_items_own_all" on public.cart_items;
drop policy if exists "cart_items_admin_all" on public.cart_items;

create policy "cart_items_own_all"
on public.cart_items
for all
using (
  exists (
    select 1
    from public.carts c
    where c.id = cart_id
      and c.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.carts c
    where c.id = cart_id
      and c.user_id = (select auth.uid())
  )
);

create policy "cart_items_admin_all"
on public.cart_items
for all
using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));

drop policy if exists "Products are viewable by everyone" on public.products;
drop policy if exists "products_read_active" on public.products;
drop policy if exists "products_admin_insert" on public.products;
drop policy if exists "products_admin_update" on public.products;
drop policy if exists "products_admin_delete" on public.products;

create policy "products_read_active"
on public.products
for select
using (is_active = true or private.is_admin((select auth.uid())));

create policy "products_admin_insert"
on public.products
for insert
with check (private.is_admin((select auth.uid())));

create policy "products_admin_update"
on public.products
for update
using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));

create policy "products_admin_delete"
on public.products
for delete
using (private.is_admin((select auth.uid())));

drop policy if exists "Public can read product images" on public.product_images;
drop policy if exists "Admins can insert product images" on public.product_images;
drop policy if exists "Admins can update product images" on public.product_images;
drop policy if exists "Admins can delete product images" on public.product_images;
drop policy if exists "product_images_public_read" on public.product_images;
drop policy if exists "product_images_admin_insert" on public.product_images;
drop policy if exists "product_images_admin_update" on public.product_images;
drop policy if exists "product_images_admin_delete" on public.product_images;

create policy "product_images_public_read"
on public.product_images
for select
using (
  exists (
    select 1
    from public.products p
    where p.product_id = product_images.product_id
      and (p.is_active = true or private.is_admin((select auth.uid())))
  )
);

create policy "product_images_admin_insert"
on public.product_images
for insert
with check (private.is_admin((select auth.uid())));

create policy "product_images_admin_update"
on public.product_images
for update
using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));

create policy "product_images_admin_delete"
on public.product_images
for delete
using (private.is_admin((select auth.uid())));

create index if not exists cart_items_cart_product_options_idx
on public.cart_items(cart_id, product_id, selected_size, selected_color);

create index if not exists idx_cart_items_cart_id
on public.cart_items(cart_id);
