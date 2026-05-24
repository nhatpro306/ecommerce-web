-- Bootstrap migration for environments where product_images/product_variants were not created yet.
-- Safe/idempotent: creates missing objects and refreshes required policies.

create extension if not exists pgcrypto;

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(product_id) on delete cascade,
  url text not null,
  alt_text text,
  sort_order int not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_id_idx
on public.product_images(product_id);

create unique index if not exists product_images_one_primary_idx
on public.product_images(product_id)
where is_primary = true;

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

create index if not exists product_variants_product_id_idx
on public.product_variants(product_id);

create index if not exists product_variants_active_stock_idx
on public.product_variants(product_id, is_active, stock);

-- Keep one primary image row for products that already have products.image.
insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
select p.product_id, p.image, p.title, 0, true
from public.products p
where p.image is not null
  and btrim(p.image) <> ''
  and not exists (
    select 1 from public.product_images pi where pi.product_id = p.product_id
  );

alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product_images_storage_public_read" on storage.objects;
create policy "product_images_storage_public_read"
on storage.objects
for select
using (bucket_id = 'product-images');

drop policy if exists "product_images_storage_admin_insert" on storage.objects;
create policy "product_images_storage_admin_insert"
on storage.objects
for insert
with check (bucket_id = 'product-images' and public.is_admin(auth.uid()));

drop policy if exists "product_images_storage_admin_update" on storage.objects;
create policy "product_images_storage_admin_update"
on storage.objects
for update
using (bucket_id = 'product-images' and public.is_admin(auth.uid()))
with check (bucket_id = 'product-images' and public.is_admin(auth.uid()));

drop policy if exists "product_images_storage_admin_delete" on storage.objects;
create policy "product_images_storage_admin_delete"
on storage.objects
for delete
using (bucket_id = 'product-images' and public.is_admin(auth.uid()));

drop policy if exists "product_images_public_read" on public.product_images;
create policy "product_images_public_read"
on public.product_images
for select
using (
  exists (
    select 1
    from public.products p
    where p.product_id = product_images.product_id
      and (p.is_active = true or public.is_admin(auth.uid()))
  )
);

drop policy if exists "product_images_admin_write" on public.product_images;
create policy "product_images_admin_write"
on public.product_images
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "product_variants_public_read" on public.product_variants;
create policy "product_variants_public_read"
on public.product_variants
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
  or public.is_admin(auth.uid())
);

drop policy if exists "product_variants_admin_write" on public.product_variants;
create policy "product_variants_admin_write"
on public.product_variants
for all
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
