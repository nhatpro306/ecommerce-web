-- Admin performance follow-up:
-- 1) add missing FK indexes used in admin joins
-- 2) rewrite RLS auth calls to init-plan friendly form: (select auth.*())
-- 3) remove duplicate permissive SELECT policy overlap on key catalog tables

create index if not exists idx_orders_shipping_address_id
  on public.orders (shipping_address_id);

create index if not exists idx_cart_items_product_id
  on public.cart_items (product_id);

create index if not exists idx_categories_parent_id
  on public.categories (parent_id);

do $$
declare
  p record;
  role_list text;
  using_expr text;
  check_expr text;
begin
  for p in
    select *
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles',
        'addresses',
        'reviews',
        'products',
        'categories',
        'orders',
        'order_items',
        'store_settings',
        'carts',
        'cart_items',
        'product_variants',
        'product_images'
      )
  loop
    using_expr := coalesce(p.qual, '');
    check_expr := coalesce(p.with_check, '');

    using_expr := replace(using_expr, 'auth.uid()', '(select auth.uid())');
    using_expr := replace(using_expr, 'auth.role()', '(select auth.role())');
    using_expr := replace(using_expr, 'auth.jwt()', '(select auth.jwt())');
    check_expr := replace(check_expr, 'auth.uid()', '(select auth.uid())');
    check_expr := replace(check_expr, 'auth.role()', '(select auth.role())');
    check_expr := replace(check_expr, 'auth.jwt()', '(select auth.jwt())');

    select string_agg(quote_ident(r), ', ')
      into role_list
    from unnest(p.roles) as r;

    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);

    execute format(
      'create policy %I on %I.%I as %s for %s to %s %s %s',
      p.policyname,
      p.schemaname,
      p.tablename,
      lower(p.permissive),
      p.cmd,
      coalesce(role_list, 'public'),
      case when using_expr <> '' then format('using (%s)', using_expr) else '' end,
      case when check_expr <> '' then format('with check (%s)', check_expr) else '' end
    );
  end loop;
end
$$;

drop policy if exists "products_read_active" on public.products;
drop policy if exists "products_admin_write" on public.products;
create policy "products_read_active" on public.products
for select
using (is_active = true or private.is_admin((select auth.uid())));
create policy "products_admin_insert" on public.products
for insert
with check (private.is_admin((select auth.uid())));
create policy "products_admin_update" on public.products
for update
using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));
create policy "products_admin_delete" on public.products
for delete
using (private.is_admin((select auth.uid())));

drop policy if exists "categories_read_all" on public.categories;
drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_read_all" on public.categories
for select
using (true);
create policy "categories_admin_insert" on public.categories
for insert
with check (private.is_admin((select auth.uid())));
create policy "categories_admin_update" on public.categories
for update
using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));
create policy "categories_admin_delete" on public.categories
for delete
using (private.is_admin((select auth.uid())));

drop policy if exists "store_settings_public_read" on public.store_settings;
drop policy if exists "store_settings_admin_write" on public.store_settings;
create policy "store_settings_public_read" on public.store_settings
for select
using (true);
create policy "store_settings_admin_insert" on public.store_settings
for insert
with check (private.is_admin((select auth.uid())));
create policy "store_settings_admin_update" on public.store_settings
for update
using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));
create policy "store_settings_admin_delete" on public.store_settings
for delete
using (private.is_admin((select auth.uid())));

drop policy if exists "product_images_public_read" on public.product_images;
drop policy if exists "product_images_admin_write" on public.product_images;
create policy "product_images_public_read" on public.product_images
for select
using (
  exists (
    select 1
    from public.products p
    where p.product_id = product_images.product_id
      and (p.is_active = true or private.is_admin((select auth.uid())))
  )
);
create policy "product_images_admin_insert" on public.product_images
for insert
with check (private.is_admin((select auth.uid())));
create policy "product_images_admin_update" on public.product_images
for update
using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));
create policy "product_images_admin_delete" on public.product_images
for delete
using (private.is_admin((select auth.uid())));

drop policy if exists "product_variants_public_read" on public.product_variants;
drop policy if exists "product_variants_admin_write" on public.product_variants;
create policy "product_variants_public_read" on public.product_variants
for select
using (
  exists (
    select 1
    from public.products p
    where p.product_id = product_variants.product_id
      and p.is_active = true
  )
  or private.is_admin((select auth.uid()))
);
create policy "product_variants_admin_insert" on public.product_variants
for insert
with check (private.is_admin((select auth.uid())));
create policy "product_variants_admin_update" on public.product_variants
for update
using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));
create policy "product_variants_admin_delete" on public.product_variants
for delete
using (private.is_admin((select auth.uid())));
