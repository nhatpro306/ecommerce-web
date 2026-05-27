-- Advisor cleanup: collapse addresses policies and drop duplicate indexes.
-- Resolves:
--   * Lint 0006 multiple_permissive_policies on public.addresses
--   * Lint 0009 duplicate_index on public.products and public.product_variants

-- 1) Addresses policies: replace overlapping ALL + admin SELECT pair with
--    one policy per command. SELECT allows owner OR admin; writes stay owner-only.

drop policy if exists "addresses_admin_select" on public.addresses;
drop policy if exists "addresses_own_all" on public.addresses;

create policy "addresses_select"
  on public.addresses
  for select
  to public
  using (
    ((select auth.uid()) = user_id)
    or (select private.is_admin((select auth.uid())))
  );

create policy "addresses_insert"
  on public.addresses
  for insert
  to public
  with check ((select auth.uid()) = user_id);

create policy "addresses_update"
  on public.addresses
  for update
  to public
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "addresses_delete"
  on public.addresses
  for delete
  to public
  using ((select auth.uid()) = user_id);

-- 2) Drop legacy duplicate indexes superseded by 20260527104703 release.

drop index if exists public.product_variants_active_stock_idx;
drop index if exists public.products_active_created_idx;
