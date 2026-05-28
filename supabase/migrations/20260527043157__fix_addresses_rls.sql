CREATE POLICY "addresses_admin_select"
  ON public.addresses
  FOR SELECT
  USING (
    (SELECT private.is_admin((SELECT auth.uid())))
  );
