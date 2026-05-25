-- =============================================================
-- 2026-05-26 — Fix private.is_admin permission denied + perf indexes
--
-- Root cause:
--   private.is_admin(uuid) was created without SECURITY DEFINER and
--   without GRANT EXECUTE. Schema "private" also lacks USAGE for the
--   anon/authenticated roles. RLS policies on products, categories,
--   product_images, product_variants, store_settings call this
--   function, so every client read on those tables returned
--   42501 "permission denied for function is_admin".
--
-- This migration is idempotent and safe to re-run.
-- =============================================================

-- 1) Ensure private schema is reachable.
create schema if not exists private;
grant usage on schema private to anon, authenticated;

-- 2) Rebuild private.is_admin(uuid) as SECURITY DEFINER reading profiles
--    directly. We do NOT rely on the admin_users view because it is
--    security_invoker and depends on the caller's RLS on profiles.
create or replace function private.is_admin(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.profiles
    where profile_id = user_id
      and role = 'admin'
      and is_active = true
  );
$$;

grant execute on function private.is_admin(uuid) to anon, authenticated, service_role;

-- 3) Align public.is_admin() (no-arg) with the same source of truth
--    so cart admin policies behave identically.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.profiles
    where profile_id = auth.uid()
      and role = 'admin'
      and is_active = true
  );
$$;

grant execute on function public.is_admin() to anon, authenticated, service_role;

-- 4) public.is_admin(uuid) — keep existing definition aligned and grant.
create or replace function public.is_admin(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.profiles
    where profile_id = check_user_id
      and role = 'admin'
      and is_active = true
  );
$$;

grant execute on function public.is_admin(uuid) to anon, authenticated, service_role;

-- 5) Performance indexes for hot query paths.
create unique index if not exists idx_products_slug_unique
  on public.products(slug)
  where slug is not null;

create index if not exists idx_product_variants_product_id
  on public.product_variants(product_id);

create index if not exists idx_reviews_product_id
  on public.reviews(product_id);

create index if not exists idx_order_items_order_id
  on public.order_items(order_id);

create index if not exists idx_order_items_product_id
  on public.order_items(product_id);

create index if not exists idx_orders_user_id
  on public.orders(user_id);

create index if not exists idx_profiles_role_active
  on public.profiles(role) where is_active = true;
