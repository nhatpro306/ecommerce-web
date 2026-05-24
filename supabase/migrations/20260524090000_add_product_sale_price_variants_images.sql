-- Align product schema with admin upload code in production.
-- This migration is idempotent and safe to re-run.

create extension if not exists pgcrypto;

-- Ensure admin helper exists in private schema, reusing existing public.is_admin when present.
create schema if not exists private;

do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.proname = 'is_admin'
      and pg_get_function_identity_arguments(p.oid) = 'user_id uuid'
  ) then
    if exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'is_admin'
        and pg_get_function_identity_arguments(p.oid) = 'user_id uuid'
    ) then
      execute $fn$
        create function private.is_admin(user_id uuid)
        returns boolean
        language sql
        stable
        as $inner$
          select public.is_admin(user_id)
        $inner$;
      $fn$;
    end if;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and p.proname = 'is_admin'
      and pg_get_function_identity_arguments(p.oid) = 'user_id uuid'
  ) then
    execute $fn$
      create function private.is_admin(user_id uuid)
      returns boolean
      language sql
      stable
      as $inner$
        select false
      $inner$;
    $fn$;
  end if;
end $$;

-- 1) products.sale_price
alter table if exists public.products
add column if not exists sale_price numeric(12, 2);

-- 2) product_variants table
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(product_id) on delete cascade,
  size text not null,
  color text not null,
  sku text unique,
  stock int not null default 0 check (stock >= 0),
  price_override numeric(12, 2),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, size, color)
);

-- 3) product_images table
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(product_id) on delete cascade,
  url text not null,
  alt_text text,
  sort_order int not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4) Indexes
create index if not exists product_variants_product_id_idx
on public.product_variants(product_id);

create index if not exists product_images_product_id_idx
on public.product_images(product_id);

create index if not exists product_images_product_id_sort_order_idx
on public.product_images(product_id, sort_order);

create unique index if not exists product_images_one_primary_idx
on public.product_images(product_id)
where is_primary = true;

-- 5) updated_at trigger reuse
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_updated_at'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    execute 'drop trigger if exists product_variants_set_updated_at on public.product_variants';
    execute 'create trigger product_variants_set_updated_at before update on public.product_variants for each row execute function public.set_updated_at()';
    execute 'drop trigger if exists product_images_set_updated_at on public.product_images';
    execute 'create trigger product_images_set_updated_at before update on public.product_images for each row execute function public.set_updated_at()';
  end if;
end $$;

-- 6) RLS + policies
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;

drop policy if exists "product_variants_public_read" on public.product_variants;
create policy "product_variants_public_read" on public.product_variants
for select
using (
  (
    is_active = true
    and exists (
      select 1
      from public.products p
      where p.product_id = product_variants.product_id
        and p.is_active = true
    )
  )
  or private.is_admin((select auth.uid()))
);

drop policy if exists "product_variants_admin_write" on public.product_variants;
create policy "product_variants_admin_write" on public.product_variants
for all
using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));

drop policy if exists "product_images_public_read" on public.product_images;
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

drop policy if exists "product_images_admin_write" on public.product_images;
create policy "product_images_admin_write" on public.product_images
for all
using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));
