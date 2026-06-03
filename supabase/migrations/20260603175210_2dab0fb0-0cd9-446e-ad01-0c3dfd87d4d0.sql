
-- Restrict direct access to courses.video_url (premium content protection).
-- Server functions use service_role (supabaseAdmin), which bypasses these grants.
REVOKE SELECT (video_url) ON public.courses FROM anon, authenticated;

-- Revoke EXECUTE on internal trigger / helper SECURITY DEFINER functions
-- that should only be called by the database, never by API clients.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()              FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.on_profile_org_change()        FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_audit_log_org()            FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_row_org_from_user()        FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at()             FROM anon, authenticated, public;
