-- Revoke EXECUTE from PUBLIC/anon on SECURITY DEFINER helpers; keep authenticated + service_role.
DO $$
DECLARE fn text;
BEGIN
  FOR fn IN
    SELECT format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid))
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname IN ('has_role','is_org_admin','is_super_admin','get_current_org_id','set_audit_log_org','set_row_org_from_user','on_profile_org_change','handle_new_user','touch_updated_at')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
  END LOOP;
END $$;
