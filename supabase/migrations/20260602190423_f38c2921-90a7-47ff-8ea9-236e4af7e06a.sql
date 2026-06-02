-- =========================================================
-- Security hardening migration
-- =========================================================

-- F-07: Restrict audit_logs INSERT policy (remove permissive user_id IS NULL).
-- Authenticated users may only insert logs for themselves; system inserts go
-- through supabaseAdmin which bypasses RLS.
DROP POLICY IF EXISTS "users insert own audit logs" ON public.audit_logs;
CREATE POLICY "users insert own audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Ensure set_audit_log_org trigger actually fires (function existed but no trigger).
DROP TRIGGER IF EXISTS trg_set_audit_log_org ON public.audit_logs;
CREATE TRIGGER trg_set_audit_log_org
BEFORE INSERT ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.set_audit_log_org();

-- F-05: Add organization_id to per-user usage tables for tenant isolation.
ALTER TABLE public.ai_chats        ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.ai_usage        ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.course_progress ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Backfill from profiles.
UPDATE public.ai_chats c        SET organization_id = p.organization_id FROM public.profiles p WHERE p.id = c.user_id AND c.organization_id IS NULL;
UPDATE public.ai_usage c        SET organization_id = p.organization_id FROM public.profiles p WHERE p.id = c.user_id AND c.organization_id IS NULL;
UPDATE public.course_progress c SET organization_id = p.organization_id FROM public.profiles p WHERE p.id = c.user_id AND c.organization_id IS NULL;

-- Auto-set organization_id from the authenticated user's profile on insert.
CREATE OR REPLACE FUNCTION public.set_row_org_from_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id FROM public.profiles WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ai_chats_set_org        ON public.ai_chats;
DROP TRIGGER IF EXISTS trg_ai_usage_set_org        ON public.ai_usage;
DROP TRIGGER IF EXISTS trg_course_progress_set_org ON public.course_progress;
CREATE TRIGGER trg_ai_chats_set_org        BEFORE INSERT ON public.ai_chats        FOR EACH ROW EXECUTE FUNCTION public.set_row_org_from_user();
CREATE TRIGGER trg_ai_usage_set_org        BEFORE INSERT ON public.ai_usage        FOR EACH ROW EXECUTE FUNCTION public.set_row_org_from_user();
CREATE TRIGGER trg_course_progress_set_org BEFORE INSERT ON public.course_progress FOR EACH ROW EXECUTE FUNCTION public.set_row_org_from_user();

-- Add org-admin read policies for tenant oversight.
CREATE POLICY "org admin reads org ai_chats"
ON public.ai_chats FOR SELECT TO authenticated
USING (organization_id = get_current_org_id() AND is_org_admin());

CREATE POLICY "org admin reads org ai_usage"
ON public.ai_usage FOR SELECT TO authenticated
USING (organization_id = get_current_org_id() AND is_org_admin());

CREATE POLICY "org admin reads org course_progress"
ON public.course_progress FOR SELECT TO authenticated
USING (organization_id = get_current_org_id() AND is_org_admin());

-- F-15: Foreign key on course_progress.course_id.
ALTER TABLE public.course_progress
  DROP CONSTRAINT IF EXISTS course_progress_course_id_fkey;
ALTER TABLE public.course_progress
  ADD CONSTRAINT course_progress_course_id_fkey
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- F-02 reinforcement: when a user changes organization (e.g. accepting an
-- invite), wipe their daily AI usage so quotas reset per-org and don't carry
-- over. Also reset their stale chat history's org_id (handled by trigger
-- above on new inserts; existing rows stay attributed to the previous org).
CREATE OR REPLACE FUNCTION public.on_profile_org_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    DELETE FROM public.ai_usage WHERE user_id = NEW.id;
    -- Re-attribute future-only rows; existing chats/progress remain owned by
    -- the user but tagged with the previous org for audit traceability.
    UPDATE public.ai_chats        SET organization_id = NEW.organization_id WHERE user_id = NEW.id AND organization_id = OLD.organization_id;
    UPDATE public.course_progress SET organization_id = NEW.organization_id WHERE user_id = NEW.id AND organization_id = OLD.organization_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_profile_org_change ON public.profiles;
CREATE TRIGGER trg_profile_org_change
AFTER UPDATE OF organization_id ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.on_profile_org_change();
