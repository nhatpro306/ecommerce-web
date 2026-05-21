-- RESEY production inventory, product images, store settings, and atomic checkout.
-- Safe incremental migration: adds tables/columns/policies without dropping existing data.

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
create policy "product_images_storage_public_read" on storage.objects
for select using (bucket_id = 'product-images');

drop policy if exists "product_images_storage_admin_insert" on storage.objects;
create policy "product_images_storage_admin_insert" on storage.objects
for insert with check (bucket_id = 'product-images' and public.is_admin(auth.uid()));

drop policy if exists "product_images_storage_admin_update" on storage.objects;
create policy "product_images_storage_admin_update" on storage.objects
for update using (bucket_id = 'product-images' and public.is_admin(auth.uid()))
with check (bucket_id = 'product-images' and public.is_admin(auth.uid()));

drop policy if exists "product_images_storage_admin_delete" on storage.objects;
create policy "product_images_storage_admin_delete" on storage.objects
for delete using (bucket_id = 'product-images' and public.is_admin(auth.uid()));

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

create table if not exists public.store_settings (
  id int primary key default 1 check (id = 1),
  store_name text,
  logo_url text,
  contact_email text,
  contact_phone text,
  address text,
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  shipping_fee numeric(12, 2) not null default 0,
  free_shipping_threshold numeric(12, 2),
  updated_at timestamptz not null default now()
);

insert into public.store_settings (
  id,
  store_name,
  logo_url,
  contact_email,
  contact_phone,
  bank_name,
  bank_account_name,
  bank_account_number,
  shipping_fee
)
values (
  1,
  'RESEY',
  '/brand/resey-logo.jpg',
  'support@resey.uk',
  'Đang cập nhật',
  'Vietcombank',
  'RESEY',
  '0123456789',
  0
)
on conflict (id) do nothing;

alter table if exists public.cart_items
add column if not exists variant_id uuid references public.product_variants(id) on delete set null;

alter table if exists public.order_items
add column if not exists variant_id uuid references public.product_variants(id) on delete restrict,
add column if not exists product_title_snapshot text,
add column if not exists product_image_snapshot text,
add column if not exists sku_snapshot text,
add column if not exists size_snapshot text,
add column if not exists color_snapshot text;

create index if not exists cart_items_variant_id_idx on public.cart_items(variant_id);
create index if not exists order_items_variant_id_idx on public.order_items(variant_id);

-- Keep updated_at fresh on variants/settings.
drop trigger if exists product_variants_set_updated_at on public.product_variants;
create trigger product_variants_set_updated_at
before update on public.product_variants
for each row execute function public.set_updated_at();

create or replace function public.set_store_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists store_settings_set_updated_at on public.store_settings;
create trigger store_settings_set_updated_at
before update on public.store_settings
for each row execute function public.set_store_settings_updated_at();

-- Seed primary product_images from existing product.image values.
insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)
select product_id, image, title, 0, true
from public.products
where image is not null
  and not exists (
    select 1 from public.product_images pi where pi.product_id = products.product_id
  );

-- Seed variants from existing sizes/colors arrays. This keeps current products sellable after migration.
insert into public.product_variants (product_id, size, color, sku, stock, price_override, image_url, is_active)
select
  p.product_id,
  size_value,
  color_value,
  concat_ws('-', p.sku, upper(regexp_replace(size_value, '[^a-zA-Z0-9]+', '', 'g')), upper(regexp_replace(color_value, '[^a-zA-Z0-9]+', '', 'g'))),
  greatest(0, floor(p.stock::numeric / greatest(1, array_length(coalesce(p.sizes, array[]::text[]), 1) * array_length(coalesce(p.colors, array[]::text[]), 1)))::int),
  null,
  p.image,
  coalesce(p.is_active, true)
from public.products p
cross join lateral unnest(
  case when array_length(coalesce(p.sizes, array[]::text[]), 1) > 0 then p.sizes else array['One Size']::text[] end
) as size_value
cross join lateral unnest(
  case when array_length(coalesce(p.colors, array[]::text[]), 1) > 0 then p.colors else array['Default']::text[] end
) as color_value
where not exists (
  select 1 from public.product_variants pv where pv.product_id = p.product_id
)
on conflict (product_id, size, color) do nothing;

-- RLS.
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.store_settings enable row level security;

drop policy if exists "product_images_public_read" on public.product_images;
create policy "product_images_public_read" on public.product_images
for select using (
  exists (
    select 1 from public.products p
    where p.product_id = product_images.product_id
      and (p.is_active = true or public.is_admin(auth.uid()))
  )
);

drop policy if exists "product_images_admin_write" on public.product_images;
create policy "product_images_admin_write" on public.product_images
for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "product_variants_public_read" on public.product_variants;
create policy "product_variants_public_read" on public.product_variants
for select using (
  is_active = true
  and exists (
    select 1 from public.products p
    where p.product_id = product_variants.product_id
      and p.is_active = true
  )
  or public.is_admin(auth.uid())
);

drop policy if exists "product_variants_admin_write" on public.product_variants;
create policy "product_variants_admin_write" on public.product_variants
for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "store_settings_public_read" on public.store_settings;
create policy "store_settings_public_read" on public.store_settings
for select using (id = 1);

drop policy if exists "store_settings_admin_write" on public.store_settings;
create policy "store_settings_admin_write" on public.store_settings
for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Ensure existing core table policies support admin management and public active reads.
drop policy if exists "products_read_active" on public.products;
create policy "products_read_active" on public.products
for select using (is_active = true or public.is_admin(auth.uid()));

drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write" on public.products
for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "categories_read_all" on public.categories;
create policy "categories_read_all" on public.categories
for select using (true);

drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write" on public.categories
for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "carts_own_all" on public.carts;
create policy "carts_own_all" on public.carts
for all using (auth.uid() = user_id or public.is_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "cart_items_own_all" on public.cart_items;
create policy "cart_items_own_all" on public.cart_items
for all using (
  exists (
    select 1 from public.carts c
    where c.id = cart_id and (c.user_id = auth.uid() or public.is_admin(auth.uid()))
  )
) with check (
  exists (
    select 1 from public.carts c
    where c.id = cart_id and (c.user_id = auth.uid() or public.is_admin(auth.uid()))
  )
);

drop policy if exists "orders_own_select_insert" on public.orders;
create policy "orders_own_select_insert" on public.orders
for all using (auth.uid() = user_id or public.is_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "order_items_own_all" on public.order_items;
create policy "order_items_own_all" on public.order_items
for all using (
  exists (
    select 1 from public.orders o
    where o.id = order_id and (o.user_id = auth.uid() or public.is_admin(auth.uid()))
  )
) with check (
  exists (
    select 1 from public.orders o
    where o.id = order_id and (o.user_id = auth.uid() or public.is_admin(auth.uid()))
  )
);

create or replace function public.create_order_checkout(payload jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  shipping_address_id_value integer := (payload->>'shipping_address_id')::integer;
  payment_method_value text := coalesce(payload->>'payment_method', 'cod');
  payment_id_value text := nullif(payload->>'payment_id', '');
  cart_id_value integer := nullif(payload->>'cart_id', '')::integer;
  created_order_id integer;
  total_amount numeric(12, 2) := 0;
  item jsonb;
  item_quantity integer;
  item_product_id uuid;
  item_variant_id uuid;
  item_size text;
  item_color text;
  variant_record record;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.addresses a
    where a.id = shipping_address_id_value and a.user_id = current_user_id
  ) then
    raise exception 'Shipping address does not belong to current user';
  end if;

  if jsonb_typeof(payload->'items') <> 'array' or jsonb_array_length(payload->'items') = 0 then
    raise exception 'Checkout requires at least one item';
  end if;

  insert into public.orders (
    user_id,
    status,
    total,
    shipping_address_id,
    payment_method,
    payment_id,
    customer_name,
    customer_phone,
    customer_email,
    customer_note
  ) values (
    current_user_id,
    'pending',
    0,
    shipping_address_id_value,
    payment_method_value,
    payment_id_value,
    nullif(payload->>'customer_name', ''),
    nullif(payload->>'customer_phone', ''),
    nullif(payload->>'customer_email', ''),
    nullif(payload->>'customer_note', '')
  ) returning id into created_order_id;

  for item in select * from jsonb_array_elements(payload->'items') loop
    item_quantity := greatest(1, coalesce((item->>'quantity')::integer, 1));
    item_size := coalesce(nullif(item->>'selected_size', ''), nullif(item->>'size', ''));
    item_color := coalesce(nullif(item->>'selected_color', ''), nullif(item->>'color', ''));
    item_variant_id := nullif(item->>'variant_id', '')::uuid;
    item_product_id := nullif(item->>'product_id', '')::uuid;

    if item_variant_id is not null then
      select
        pv.id,
        pv.product_id,
        pv.size,
        pv.color,
        pv.sku,
        pv.stock,
        coalesce(pv.price_override, p.price) as unit_price,
        coalesce(pv.image_url, p.image) as image_url,
        p.title as product_title
      into variant_record
      from public.product_variants pv
      join public.products p on p.product_id = pv.product_id
      where pv.id = item_variant_id
        and pv.is_active = true
        and p.is_active = true
      for update of pv;
    else
      select
        pv.id,
        pv.product_id,
        pv.size,
        pv.color,
        pv.sku,
        pv.stock,
        coalesce(pv.price_override, p.price) as unit_price,
        coalesce(pv.image_url, p.image) as image_url,
        p.title as product_title
      into variant_record
      from public.product_variants pv
      join public.products p on p.product_id = pv.product_id
      where pv.product_id = item_product_id
        and pv.size = item_size
        and pv.color = item_color
        and pv.is_active = true
        and p.is_active = true
      for update of pv;
    end if;

    if variant_record.id is null then
      raise exception 'Variant is no longer available';
    end if;

    if variant_record.stock < item_quantity then
      raise exception 'Not enough stock for % / %', variant_record.size, variant_record.color;
    end if;

    update public.product_variants
    set stock = stock - item_quantity, updated_at = now()
    where id = variant_record.id;

    insert into public.order_items (
      order_id,
      product_id,
      variant_id,
      quantity,
      price,
      selected_size,
      selected_color,
      variant_info,
      product_title_snapshot,
      product_image_snapshot,
      sku_snapshot,
      size_snapshot,
      color_snapshot
    ) values (
      created_order_id,
      variant_record.product_id,
      variant_record.id,
      item_quantity,
      variant_record.unit_price,
      variant_record.size,
      variant_record.color,
      jsonb_build_object(
        'variant_id', variant_record.id,
        'sku', variant_record.sku,
        'size', variant_record.size,
        'color', variant_record.color
      ),
      variant_record.product_title,
      variant_record.image_url,
      variant_record.sku,
      variant_record.size,
      variant_record.color
    );

    total_amount := total_amount + (variant_record.unit_price * item_quantity);
  end loop;

  update public.orders
  set total = total_amount, updated_at = now()
  where id = created_order_id;

  if cart_id_value is not null then
    update public.carts
    set status = 'converted', updated_at = now()
    where id = cart_id_value and user_id = current_user_id;
  else
    update public.carts
    set status = 'converted', updated_at = now()
    where user_id = current_user_id and status = 'active';
  end if;

  return created_order_id;
end;
$$;

revoke all on function public.create_order_checkout(jsonb) from public;
grant execute on function public.create_order_checkout(jsonb) to authenticated;

