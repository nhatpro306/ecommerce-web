-- =============================================================
-- 2026-05-26 — Security lint fixes
--
-- Addresses Supabase security linter warnings:
--
-- 1. function_search_path_mutable
--    public.set_store_settings_updated_at had no SET search_path.
--    Recreated with SET search_path = ''.
--
-- 2. anon_security_definer_function_executable
--    public.is_admin() and public.is_admin(uuid) had EXECUTE
--    granted to anon. App code never calls these via RPC and all
--    RLS policies use private.is_admin(). Revoked from anon.
--
-- 3. anon + authenticated SECURITY DEFINER on public.is_admin
--    Revoking from authenticated too is safe: the app uses
--    admin_users view and profiles table — not is_admin() RPC.
--    RLS still works via private.is_admin().
--
-- 4. public_bucket_allows_listing (storage.objects)
--    product-images bucket had two overlapping broad SELECT
--    policies. Dropped the duplicate.
--
-- 5. create_order_checkout SECURITY DEFINER (authenticated)
--    Intentional — authenticated users must be able to create
--    orders. Left unchanged.
--
-- 6. auth_leaked_password_protection
--    Dashboard-only setting. Enable at:
--    Supabase Dashboard → Authentication → Providers →
--    Email → Leaked Password Protection (toggle ON).
--
-- This migration is idempotent and safe to re-run.
-- =============================================================


-- ------------------------------------------------------------
-- 1. Fix function_search_path_mutable
--    Recreate set_store_settings_updated_at with fixed path.
-- ------------------------------------------------------------

create or replace function public.set_store_settings_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ------------------------------------------------------------
-- 2 & 3. Revoke public.is_admin() from anon + authenticated.
--
-- Safe because:
--   - RLS policies call private.is_admin(), not public.is_admin()
--   - App hooks use admin_users view + profiles table directly
--   - service_role keep EXECUTE for server-side use if needed
-- ------------------------------------------------------------

revoke execute on function public.is_admin()
  from anon, authenticated;

revoke execute on function public.is_admin(uuid)
  from anon, authenticated;


-- ------------------------------------------------------------
-- 4. Remove duplicate storage SELECT policy on product-images.
--
-- "Public can view product images" is kept.
-- "product_images_storage_public_read" is the duplicate.
-- ------------------------------------------------------------

drop policy if exists "product_images_storage_public_read" on storage.objects;
