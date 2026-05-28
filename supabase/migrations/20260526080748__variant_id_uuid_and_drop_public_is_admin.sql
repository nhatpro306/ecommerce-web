begin;

-- cart_items.variant_id is already uuid; add FK if missing.
alter table public.cart_items
  drop constraint if exists cart_items_variant_id_fkey;

alter table public.cart_items
  add constraint cart_items_variant_id_fkey
  foreign key (variant_id) references public.product_variants(id)
  on delete set null;

-- order_items.variant_id is already uuid; add FK if missing.
alter table public.order_items
  drop constraint if exists order_items_variant_id_fkey;

alter table public.order_items
  add constraint order_items_variant_id_fkey
  foreign key (variant_id) references public.product_variants(id)
  on delete set null;

-- Refresh indexes.
drop index if exists public.cart_items_variant_id_idx;
create index cart_items_variant_id_idx on public.cart_items (variant_id);

drop index if exists public.order_items_variant_id_idx;
create index order_items_variant_id_idx on public.order_items (variant_id);

-- Drop stale public.is_admin overloads.
drop function if exists public.is_admin(uuid);
drop function if exists public.is_admin();

-- Composite index for storefront listing.
create index if not exists products_active_created_idx
  on public.products (is_active, created_at desc);

commit;
