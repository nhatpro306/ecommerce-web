-- Repair admin helper permissions and cart RLS without disabling RLS.
-- This migration is intentionally idempotent and does not modify production data.

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

-- Keep cart ownership checks independent from admin checks. This prevents a
-- broken admin helper from blocking normal customers' own carts.
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
using (public.is_admin((select auth.uid())))
with check (public.is_admin((select auth.uid())));

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
using (public.is_admin((select auth.uid())))
with check (public.is_admin((select auth.uid())));

create index if not exists cart_items_cart_product_options_idx
on public.cart_items(cart_id, product_id, selected_size, selected_color);

create index if not exists orders_created_at_desc_idx
on public.orders(created_at desc);

create index if not exists orders_status_created_at_desc_idx
on public.orders(status, created_at desc);
