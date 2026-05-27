-- Tighten public variant visibility and validate cart quantity server-side.

create or replace function public.validate_cart_item_quantity(
  p_cart_item_id integer,
  p_quantity integer
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  cart_row record;
  available_stock integer;
  has_active_variants boolean;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_cart_item_id is null then
    raise exception 'Missing cart item id';
  end if;

  if p_quantity is null or p_quantity < 0 then
    raise exception 'Invalid quantity';
  end if;

  if p_quantity = 0 then
    return true;
  end if;

  select
    ci.id,
    ci.product_id,
    ci.variant_id,
    c.user_id,
    p.stock as product_stock,
    p.is_active as product_is_active,
    pv.stock as variant_stock,
    pv.is_active as variant_is_active
  into cart_row
  from public.cart_items ci
  join public.carts c on c.id = ci.cart_id
  join public.products p on p.product_id = ci.product_id
  left join public.product_variants pv on pv.id = ci.variant_id
  where ci.id = p_cart_item_id
  for update of ci;

  if not found or cart_row.user_id <> current_user_id then
    raise exception 'Cart item not found';
  end if;

  if cart_row.product_is_active is not true then
    raise exception 'Product is no longer available';
  end if;

  if cart_row.variant_id is not null then
    if cart_row.variant_is_active is not true then
      raise exception 'Variant is no longer available';
    end if;
    available_stock := coalesce(cart_row.variant_stock, 0);
  else
    select exists (
      select 1
      from public.product_variants pv
      where pv.product_id = cart_row.product_id
        and pv.is_active = true
    ) into has_active_variants;

    if has_active_variants then
      raise exception 'Variant selection is required';
    end if;

    available_stock := coalesce(cart_row.product_stock, 0);
  end if;

  if available_stock < p_quantity then
    raise exception 'Not enough stock';
  end if;

  return true;
end;
$$;

revoke all on function public.validate_cart_item_quantity(integer, integer) from public;
grant execute on function public.validate_cart_item_quantity(integer, integer) to authenticated, service_role;

drop policy if exists "product_variants_public_read" on public.product_variants;
create policy "product_variants_public_read"
on public.product_variants
for select
using (
  (
    product_variants.is_active = true
    and exists (
      select 1
      from public.products p
      where p.product_id = product_variants.product_id
        and p.is_active = true
    )
  )
  or private.is_admin((select auth.uid()))
);

drop policy if exists "orders_own_select_insert" on public.orders;
create policy "orders_own_select_insert"
on public.orders
for all
using ((select auth.uid()) = user_id or private.is_admin((select auth.uid())))
with check ((select auth.uid()) = user_id or private.is_admin((select auth.uid())));

drop policy if exists "order_items_own_all" on public.order_items;
create policy "order_items_own_all"
on public.order_items
for all
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and (o.user_id = (select auth.uid()) or private.is_admin((select auth.uid())))
  )
)
with check (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and (o.user_id = (select auth.uid()) or private.is_admin((select auth.uid())))
  )
);

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using ((select auth.uid()) = profile_id or private.is_admin((select auth.uid())));

drop policy if exists "product_images_storage_public_read" on storage.objects;
drop policy if exists "product_images_storage_admin_insert" on storage.objects;
drop policy if exists "product_images_storage_admin_update" on storage.objects;
drop policy if exists "product_images_storage_admin_delete" on storage.objects;

create policy "product_images_storage_admin_insert"
on storage.objects
for insert
with check (bucket_id = 'product-images' and private.is_admin(auth.uid()));

create policy "product_images_storage_admin_update"
on storage.objects
for update
using (bucket_id = 'product-images' and private.is_admin(auth.uid()))
with check (bucket_id = 'product-images' and private.is_admin(auth.uid()));

create policy "product_images_storage_admin_delete"
on storage.objects
for delete
using (bucket_id = 'product-images' and private.is_admin(auth.uid()));

create or replace function public.set_store_settings_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.is_admin(uuid) from anon, authenticated;
