-- =============================================================
-- RESEY Production Fix Migration
-- Date: 2026-05-25
-- Fixes:
--   1. is_admin() SECURITY DEFINER + execute grants
--   2. carts RLS — remove is_admin() dependency for normal users
--   3. cart_items RLS — own-cart check only
--   4. product_images RLS — public read + admin write (fixed)
--   5. Storage bucket policy note
--   6. Performance indexes
-- =============================================================

-- --------------------------------------------------------
-- 1. Fix public.is_admin()
-- Must be SECURITY DEFINER so it can read admin_users as the
-- function owner rather than the calling user.
-- --------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.profiles p
    where p.profile_id = auth.uid()
      and p.role = 'admin'
      and p.is_active = true
  );
$$;

-- Grant execute so any authenticated (or anon) caller can invoke it
-- without hitting "permission denied for function is_admin".
grant execute on function public.is_admin() to anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;

-- --------------------------------------------------------
-- NOTE: if your project uses profiles.role = 'admin' instead
-- of a separate admin_users table, replace the function body with:
--
--   select exists (
--     select 1 from public.profiles
--     where profile_id = auth.uid() and role = 'admin'
--   );
--
-- and drop admin_users references.
-- --------------------------------------------------------

-- --------------------------------------------------------
-- 2. carts RLS — users manage only their own cart
--    DO NOT call is_admin() here; normal users must reach carts.
-- --------------------------------------------------------

alter table public.carts enable row level security;

drop policy if exists "carts_select_own"         on public.carts;
drop policy if exists "carts_insert_own"         on public.carts;
drop policy if exists "carts_update_own"         on public.carts;
drop policy if exists "carts_delete_own"         on public.carts;
drop policy if exists "carts_admin_all"          on public.carts;
drop policy if exists "carts_admin_read_all"     on public.carts;
-- Drop any legacy policies that might call is_admin():
drop policy if exists "Enable read access for users" on public.carts;
drop policy if exists "Enable insert for authenticated users" on public.carts;
drop policy if exists "Enable update for cart owners" on public.carts;
drop policy if exists "Enable delete for cart owners" on public.carts;

create policy "carts_select_own"
  on public.carts for select
  to authenticated
  using (user_id = auth.uid());

create policy "carts_insert_own"
  on public.carts for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "carts_update_own"
  on public.carts for update
  to authenticated
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "carts_delete_own"
  on public.carts for delete
  to authenticated
  using (user_id = auth.uid());

-- Admin can read all carts (for order management)
create policy "carts_admin_read_all"
  on public.carts for select
  to authenticated
  using (public.is_admin());

grant select, insert, update, delete on public.carts to authenticated;

-- --------------------------------------------------------
-- 3. cart_items RLS — only through carts the user owns
-- --------------------------------------------------------

alter table public.cart_items enable row level security;

drop policy if exists "cart_items_select_own" on public.cart_items;
drop policy if exists "cart_items_insert_own" on public.cart_items;
drop policy if exists "cart_items_update_own" on public.cart_items;
drop policy if exists "cart_items_delete_own" on public.cart_items;
drop policy if exists "cart_items_admin_all"  on public.cart_items;
drop policy if exists "Enable read access for cart owners" on public.cart_items;
drop policy if exists "Enable insert for cart owners"      on public.cart_items;
drop policy if exists "Enable update for cart owners"      on public.cart_items;
drop policy if exists "Enable delete for cart owners"      on public.cart_items;

create policy "cart_items_select_own"
  on public.cart_items for select
  to authenticated
  using (
    exists (
      select 1 from public.carts c
      where c.id = cart_items.cart_id
        and c.user_id = auth.uid()
    )
  );

create policy "cart_items_insert_own"
  on public.cart_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.carts c
      where c.id = cart_items.cart_id
        and c.user_id = auth.uid()
    )
  );

create policy "cart_items_update_own"
  on public.cart_items for update
  to authenticated
  using (
    exists (
      select 1 from public.carts c
      where c.id = cart_items.cart_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.carts c
      where c.id = cart_items.cart_id
        and c.user_id = auth.uid()
    )
  );

create policy "cart_items_delete_own"
  on public.cart_items for delete
  to authenticated
  using (
    exists (
      select 1 from public.carts c
      where c.id = cart_items.cart_id
        and c.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.cart_items to authenticated;

-- --------------------------------------------------------
-- 4. product_images RLS
--    Public read. Admin write. Now safe because is_admin()
--    is SECURITY DEFINER above.
-- --------------------------------------------------------

alter table public.product_images enable row level security;

drop policy if exists "product_images_public_read"  on public.product_images;
drop policy if exists "product_images_admin_insert" on public.product_images;
drop policy if exists "product_images_admin_update" on public.product_images;
drop policy if exists "product_images_admin_delete" on public.product_images;
drop policy if exists "product_images_admin_all"    on public.product_images;
drop policy if exists "Enable read access for all users" on public.product_images;

create policy "product_images_public_read"
  on public.product_images for select
  to anon, authenticated
  using (true);

create policy "product_images_admin_insert"
  on public.product_images for insert
  to authenticated
  with check (public.is_admin());

create policy "product_images_admin_update"
  on public.product_images for update
  to authenticated
  using  (public.is_admin())
  with check (public.is_admin());

create policy "product_images_admin_delete"
  on public.product_images for delete
  to authenticated
  using (public.is_admin());

grant select on public.product_images to anon;
grant select, insert, update, delete on public.product_images to authenticated;

-- --------------------------------------------------------
-- 5. Prevent duplicate active carts per user (optional)
--    Only run if no user already has > 1 active cart.
--    Check first: SELECT user_id, count(*) FROM carts
--                 WHERE status = 'active' GROUP BY user_id HAVING count(*) > 1;
--    If that returns rows, clean up duplicates before enabling.
-- --------------------------------------------------------

-- create unique index if not exists idx_carts_one_active_per_user
--   on public.carts(user_id)
--   where status = 'active';

-- --------------------------------------------------------
-- 6. Performance indexes
-- --------------------------------------------------------

create index if not exists idx_carts_user_status
  on public.carts(user_id, status);

create index if not exists idx_cart_items_cart_id
  on public.cart_items(cart_id);

create index if not exists idx_cart_items_product_id
  on public.cart_items(product_id);

create index if not exists idx_product_images_product_id
  on public.product_images(product_id);

create index if not exists idx_products_created_at
  on public.products(created_at desc);

create index if not exists idx_products_is_active
  on public.products(is_active);

create index if not exists idx_products_category_id
  on public.products(category_id);

create index if not exists idx_orders_created_at
  on public.orders(created_at desc);

create index if not exists idx_orders_status
  on public.orders(status);

-- --------------------------------------------------------
-- 7. Storage: product-images bucket
--    Run these in the Supabase Dashboard → Storage → Policies
--    OR via SQL (storage schema must be accessible).
--
--    The bucket named "product-images" must:
--      - Exist (create in Dashboard if missing)
--      - Be public (for getPublicUrl to work without auth)
--      - Allow authenticated admins to upload
--
--    Bucket policies (if using SQL approach):
-- --------------------------------------------------------

-- insert into storage.buckets (id, name, public)
-- values ('product-images', 'product-images', true)
-- on conflict (id) do update set public = true;

-- drop policy if exists "product_images_storage_public_read" on storage.objects;
-- create policy "product_images_storage_public_read"
--   on storage.objects for select
--   to anon, authenticated
--   using (bucket_id = 'product-images');

-- drop policy if exists "product_images_storage_admin_upload" on storage.objects;
-- create policy "product_images_storage_admin_upload"
--   on storage.objects for insert
--   to authenticated
--   with check (bucket_id = 'product-images' and public.is_admin());

-- drop policy if exists "product_images_storage_admin_delete" on storage.objects;
-- create policy "product_images_storage_admin_delete"
--   on storage.objects for delete
--   to authenticated
--   using (bucket_id = 'product-images' and public.is_admin());
