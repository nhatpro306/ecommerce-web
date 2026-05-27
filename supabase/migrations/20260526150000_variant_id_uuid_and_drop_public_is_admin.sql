-- Phase 1 production stability migration.
-- 1) Convert cart_items.variant_id and order_items.variant_id from text to uuid.
-- 2) Re-establish foreign keys to product_variants(id).
-- 3) Drop stale public.is_admin overloads (all RLS policies use private.is_admin).
-- 4) Add composite index for storefront listing.
--
-- Safe to run multiple times (idempotent on drop/create index).
-- Pre-checks abort the whole transaction if data is dirty.

begin;

------------------------------------------------------------------------
-- 0. Sanity pre-checks — abort early if data is dirty.
------------------------------------------------------------------------

do $$
declare
  bad_cart  int;
  bad_order int;
begin
  select count(*) into bad_cart
  from public.cart_items
  where variant_id is not null
    and variant_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  select count(*) into bad_order
  from public.order_items
  where variant_id is not null
    and variant_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  if bad_cart > 0 then
    raise exception 'cart_items has % rows with non-UUID variant_id. Clean before retry.', bad_cart;
  end if;
  if bad_order > 0 then
    raise exception 'order_items has % rows with non-UUID variant_id. Clean before retry.', bad_order;
  end if;
end$$;

-- Null out cart_items.variant_id values that don't resolve to a live variant.
update public.cart_items ci
set variant_id = null
where variant_id is not null
  and not exists (
    select 1 from public.product_variants pv where pv.id::text = ci.variant_id
  );

------------------------------------------------------------------------
-- 1. cart_items.variant_id : text -> uuid + FK (ON DELETE SET NULL)
------------------------------------------------------------------------

alter table public.cart_items
  drop constraint if exists cart_items_variant_id_fkey;

alter table public.cart_items
  alter column variant_id type uuid
  using nullif(variant_id, '')::uuid;

alter table public.cart_items
  add constraint cart_items_variant_id_fkey
  foreign key (variant_id) references public.product_variants(id)
  on delete set null;

------------------------------------------------------------------------
-- 2. order_items.variant_id : text -> uuid + FK (ON DELETE SET NULL)
--    SET NULL preserves historical order rows when a variant is removed.
------------------------------------------------------------------------

alter table public.order_items
  drop constraint if exists order_items_variant_id_fkey;

alter table public.order_items
  alter column variant_id type uuid
  using nullif(variant_id, '')::uuid;

alter table public.order_items
  add constraint order_items_variant_id_fkey
  foreign key (variant_id) references public.product_variants(id)
  on delete set null;

------------------------------------------------------------------------
-- 3. Refresh indexes (drop + recreate so btree uses uuid type).
------------------------------------------------------------------------

drop index if exists public.cart_items_variant_id_idx;
create index cart_items_variant_id_idx on public.cart_items (variant_id);

drop index if exists public.order_items_variant_id_idx;
create index order_items_variant_id_idx on public.order_items (variant_id);

------------------------------------------------------------------------
-- 4. Drop stale public.is_admin overloads.
--    private.is_admin(uuid) stays — it is the one all RLS policies call.
------------------------------------------------------------------------

drop function if exists public.is_admin(uuid);
drop function if exists public.is_admin();

------------------------------------------------------------------------
-- 5. Composite index for storefront listing (is_active + created_at).
------------------------------------------------------------------------

create index if not exists products_active_created_idx
  on public.products (is_active, created_at desc);

commit;
