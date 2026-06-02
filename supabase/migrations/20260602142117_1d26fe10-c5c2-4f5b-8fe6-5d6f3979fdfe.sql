
-- 1. Table organizations
CREATE TABLE public.organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  plan        text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','enterprise')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 2. organization_id sur profiles + audit_logs
ALTER TABLE public.profiles  ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.audit_logs ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX idx_profiles_org   ON public.profiles(organization_id);
CREATE INDEX idx_audit_logs_org ON public.audit_logs(organization_id);

-- 3. Backfill org par défaut
INSERT INTO public.organizations (name, slug, plan)
VALUES ('Default Organization', 'default', 'free');

UPDATE public.profiles
SET organization_id = (SELECT id FROM public.organizations WHERE slug = 'default')
WHERE organization_id IS NULL;

UPDATE public.audit_logs
SET organization_id = (SELECT id FROM public.organizations WHERE slug = 'default')
WHERE organization_id IS NULL AND user_id IS NOT NULL;

-- 4. Promotion: premier user = super_admin, autres = admin
WITH first_user AS (
  SELECT id FROM public.profiles ORDER BY created_at ASC LIMIT 1
)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role FROM first_user
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::app_role
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id)
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. profiles.organization_id NOT NULL
ALTER TABLE public.profiles ALTER COLUMN organization_id SET NOT NULL;

-- 6. Helpers SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_current_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin'::app_role)
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin'::app_role, 'super_admin'::app_role)
  )
$$;

-- 7. handle_new_user : crée une org + assigne admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_org_id uuid;
  org_name   text;
  base_slug  text;
  final_slug text;
  i int := 0;
BEGIN
  org_name := COALESCE(
    NEW.raw_user_meta_data->>'organization_name',
    (NEW.raw_user_meta_data->>'full_name') || '''s workspace',
    split_part(NEW.email, '@', 1) || '''s workspace'
  );

  base_slug := regexp_replace(lower(split_part(NEW.email,'@',1)), '[^a-z0-9]+','-','g');
  IF base_slug = '' OR base_slug IS NULL THEN base_slug := 'org'; END IF;
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = final_slug) LOOP
    i := i + 1;
    final_slug := base_slug || '-' || i::text;
  END LOOP;

  INSERT INTO public.organizations (name, slug)
  VALUES (org_name, final_slug)
  RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (id, email, full_name, organization_id)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', new_org_id);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. RLS organizations
CREATE POLICY "members read their org"
ON public.organizations FOR SELECT TO authenticated
USING (id = public.get_current_org_id() OR public.is_super_admin());

CREATE POLICY "super_admin insert orgs"
ON public.organizations FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin update orgs"
ON public.organizations FOR UPDATE TO authenticated
USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin delete orgs"
ON public.organizations FOR DELETE TO authenticated
USING (public.is_super_admin());

-- 9. RLS profiles : ajout admin-org + super_admin
CREATE POLICY "org admin reads org profiles"
ON public.profiles FOR SELECT TO authenticated
USING (organization_id = public.get_current_org_id() AND public.is_org_admin());

CREATE POLICY "super_admin reads all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_super_admin());

-- 10. RLS audit_logs : remplacer la policy admin existante
DROP POLICY IF EXISTS "admins read all audit logs" ON public.audit_logs;

CREATE POLICY "org admin reads org audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (organization_id = public.get_current_org_id() AND public.is_org_admin());

CREATE POLICY "super_admin reads all audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.is_super_admin());

-- 11. Trigger pour stamper organization_id sur les inserts d'audit
CREATE OR REPLACE FUNCTION public.set_audit_log_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id FROM public.profiles WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_audit_log_org ON public.audit_logs;
CREATE TRIGGER trg_set_audit_log_org
BEFORE INSERT ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.set_audit_log_org();

-- 12. updated_at sur organizations
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_organizations_touch
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
