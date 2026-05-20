-- RESEY base schema for a fresh Supabase project.
-- Run this FIRST in Supabase SQL Editor, then run files in supabase/migrations in order.
-- This script is intentionally non-destructive: it uses IF NOT EXISTS where possible.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  profile_id uuid primary key references auth.users(id) on delete cascade,
  username text default '',
  avatar_url text default '',
  email text,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

create or replace function public.is_admin(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where profile_id = check_user_id
      and role = 'admin'
      and is_active = true
  );
$$;

create or replace view public.admin_users with (security_invoker = true) as
select profile_id, username, email, role, is_active, created_at, updated_at
from public.profiles
where role = 'admin' and is_active = true;

create table if not exists public.categories (
  id serial primary key,
  name varchar(255) not null unique,
  description text not null default '',
  parent_id integer references public.categories(id) on delete set null
);

create table if not exists public.products (
  product_id uuid primary key default gen_random_uuid(),
  title varchar(255) not null,
  description text not null default '',
  price numeric(12, 2) not null check (price >= 0),
  image varchar(1000),
  stock integer not null default 0 check (stock >= 0),
  sku varchar(100) unique,
  category_id integer references public.categories(id) on delete set null,
  is_active boolean not null default true,
  slug text unique,
  material text,
  sizes text[] not null default array[]::text[],
  colors text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

create table if not exists public.addresses (
  id serial primary key,
  user_id uuid not null references public.profiles(profile_id) on delete cascade,
  street varchar(500) not null,
  city varchar(255) not null,
  state varchar(255),
  zip_code varchar(50) not null,
  country varchar(255) not null default 'Vietnam',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

create table if not exists public.carts (
  id serial primary key,
  user_id uuid not null references public.profiles(profile_id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'abandoned', 'converted')),
  total_items integer not null default 0,
  total_price numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

create unique index if not exists carts_one_active_per_user_idx
on public.carts(user_id)
where status = 'active';

create table if not exists public.cart_items (
  id serial primary key,
  cart_id integer not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(product_id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  price numeric(12, 2) not null check (price >= 0),
  selected_size text,
  selected_color text,
  variant_info jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

create index if not exists cart_items_cart_id_idx on public.cart_items(cart_id);

create table if not exists public.orders (
  id serial primary key,
  user_id uuid not null references public.profiles(profile_id) on delete cascade,
  status text not null default 'pending',
  total numeric(12, 2) not null check (total >= 0),
  shipping_address_id integer not null references public.addresses(id) on delete restrict,
  payment_method text,
  payment_id varchar(255),
  customer_name text,
  customer_phone text,
  customer_email text,
  customer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

create unique index if not exists orders_payment_id_unique_idx
on public.orders(payment_id)
where payment_id is not null;

create table if not exists public.order_items (
  id serial primary key,
  order_id integer not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(product_id) on delete restrict,
  quantity integer not null check (quantity > 0),
  price numeric(12, 2) not null check (price >= 0),
  selected_size text,
  selected_color text,
  variant_info jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id serial primary key,
  product_id uuid not null references public.products(product_id) on delete cascade,
  user_id uuid not null references public.profiles(profile_id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_orders_user on public.orders(user_id);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_items_product on public.order_items(product_id);
create index if not exists idx_reviews_product on public.reviews(product_id);
create index if not exists idx_reviews_user on public.reviews(user_id);
create index if not exists idx_addresses_user on public.addresses(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.refresh_cart_totals(target_cart_id integer)
returns void
language plpgsql
as $$
begin
  update public.carts
  set
    total_items = coalesce((select sum(quantity) from public.cart_items where cart_id = target_cart_id), 0),
    total_price = coalesce((select sum(quantity * price) from public.cart_items where cart_id = target_cart_id), 0),
    updated_at = now()
  where id = target_cart_id;
end;
$$;

create or replace function public.cart_items_refresh_cart_totals()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_cart_totals(old.cart_id);
    return old;
  end if;

  perform public.refresh_cart_totals(new.cart_id);
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists addresses_set_updated_at on public.addresses;
create trigger addresses_set_updated_at before update on public.addresses
for each row execute function public.set_updated_at();

drop trigger if exists carts_set_updated_at on public.carts;
create trigger carts_set_updated_at before update on public.carts
for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists cart_items_refresh_cart_totals_after_insert on public.cart_items;
create trigger cart_items_refresh_cart_totals_after_insert
after insert on public.cart_items
for each row execute function public.cart_items_refresh_cart_totals();

drop trigger if exists cart_items_refresh_cart_totals_after_update on public.cart_items;
create trigger cart_items_refresh_cart_totals_after_update
after update on public.cart_items
for each row execute function public.cart_items_refresh_cart_totals();

drop trigger if exists cart_items_refresh_cart_totals_after_delete on public.cart_items;
create trigger cart_items_refresh_cart_totals_after_delete
after delete on public.cart_items
for each row execute function public.cart_items_refresh_cart_totals();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.addresses enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = profile_id or public.is_admin(auth.uid()));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = profile_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

drop policy if exists "categories_read_all" on public.categories;
create policy "categories_read_all" on public.categories
for select using (true);

drop policy if exists "products_read_active" on public.products;
create policy "products_read_active" on public.products
for select using (is_active = true or public.is_admin(auth.uid()));

drop policy if exists "products_admin_write" on public.products;
create policy "products_admin_write" on public.products
for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write" on public.categories
for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists "addresses_own_all" on public.addresses;
create policy "addresses_own_all" on public.addresses
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "carts_own_all" on public.carts;
create policy "carts_own_all" on public.carts
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "cart_items_own_all" on public.cart_items;
create policy "cart_items_own_all" on public.cart_items
for all using (
  exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
) with check (
  exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
);

drop policy if exists "orders_own_select_insert" on public.orders;
create policy "orders_own_select_insert" on public.orders
for all using (
  auth.uid() = user_id or public.is_admin(auth.uid())
) with check (
  auth.uid() = user_id or public.is_admin(auth.uid())
);

drop policy if exists "order_items_own_all" on public.order_items;
create policy "order_items_own_all" on public.order_items
for all using (
  exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin(auth.uid())))
) with check (
  exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin(auth.uid())))
);

drop policy if exists "reviews_read_all" on public.reviews;
create policy "reviews_read_all" on public.reviews
for select using (true);

drop policy if exists "reviews_own_write" on public.reviews;
create policy "reviews_own_write" on public.reviews
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


