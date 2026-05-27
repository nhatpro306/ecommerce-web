-- Add admin bypass on addresses table.
--
-- Current state: policy `addresses_own_all` already exists and grants users
-- access to their own addresses (auth.uid() = user_id). However it has no
-- admin bypass, so admins cannot view/manage other users' shipping addresses.
--
-- Today this is latent: all existing orders belong to the admin user, so the
-- own-policy is enough. As soon as a real customer places an order, the
-- admin orders page will inner-join `addresses` and miss that customer's
-- shipping data ("Không thể tải đơn hàng" or empty result).
--
-- Fix: add a single admin-only SELECT policy. Keep existing
-- `addresses_own_all` untouched. PostgreSQL ORs PERMISSIVE policies, so user
-- access is unchanged.

CREATE POLICY "addresses_admin_select"
  ON public.addresses
  FOR SELECT
  USING (
    (SELECT private.is_admin((SELECT auth.uid())))
  );
