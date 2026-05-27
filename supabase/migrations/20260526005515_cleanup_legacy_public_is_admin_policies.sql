-- Final cleanup for legacy policies that still call public.is_admin().
-- public.is_admin() execution is revoked from anon/authenticated, so any RLS
-- policy that still calls it can fail with "permission denied for function
-- is_admin". Keep RLS enabled and route admin checks through private.is_admin().

-- Product images: drop policies from older migrations that used public.is_admin()
-- or direct profile checks, then recreate one consistent set.
drop policy if exists "product_images_admin_insert" on public.product_images;
drop policy if exists "product_images_admin_update" on public.product_images;
drop policy if exists "product_images_admin_delete" on public.product_images;
drop policy if exists "product_images_admin_all" on public.product_images;
drop policy if exists "product_images_admin_write" on public.product_images;
drop policy if exists "Admins can insert product images" on public.product_images;
drop policy if exists "Admins can update product images" on public.product_images;
drop policy if exists "Admins can delete product images" on public.product_images;

create policy "product_images_admin_insert" on public.product_images
for insert
with check ((select private.is_admin((select auth.uid()))));

create policy "product_images_admin_update" on public.product_images
for update
using ((select private.is_admin((select auth.uid()))))
with check ((select private.is_admin((select auth.uid()))));

create policy "product_images_admin_delete" on public.product_images
for delete
using ((select private.is_admin((select auth.uid()))));

-- Orders: older checkout migrations used unqualified is_admin(), which resolves
-- to public.is_admin(). Preserve user-owned access and admin read/write.
drop policy if exists "orders_own_select_insert" on public.orders;

create policy "orders_own_select_insert" on public.orders
for all
using (
  user_id = (select auth.uid())
  or (select private.is_admin((select auth.uid())))
)
with check (
  user_id = (select auth.uid())
  or (select private.is_admin((select auth.uid())))
);

drop policy if exists "order_items_own_all" on public.order_items;

create policy "order_items_own_all" on public.order_items
for all
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and (
        o.user_id = (select auth.uid())
        or (select private.is_admin((select auth.uid())))
      )
  )
)
with check (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and (
        o.user_id = (select auth.uid())
        or (select private.is_admin((select auth.uid())))
      )
  )
);

-- Keep public.is_admin() unavailable as a client-callable RPC. RLS policies now
-- call private.is_admin(), and order checkout intentionally remains separate.
revoke execute on function public.is_admin() from public, anon, authenticated;
