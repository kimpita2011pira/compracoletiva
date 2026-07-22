
DROP POLICY IF EXISTS "System can insert roles" ON public.user_roles;
CREATE POLICY "System can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND role IN ('CLIENTE'::public.app_role, 'VENDEDOR'::public.app_role));

DROP POLICY IF EXISTS "Franchisees view audit logs" ON public.audit_logs;
CREATE POLICY "Franchisees view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    admin_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.franchises WHERE user_id = auth.uid() AND active = true)
  );
