-- Remove duplicate permissive SELECT policies on carts by merging owner/admin read.

drop policy if exists "carts_select_own" on public.carts;
drop policy if exists "carts_admin_read" on public.carts;

create policy "carts_select_own_or_admin"
  on public.carts for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_admin((select auth.uid())))
  );
