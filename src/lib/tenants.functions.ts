import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = ["super_admin", "admin", "manager", "user"] as const;
const PLANS = ["free", "pro", "enterprise"] as const;

async function loadContext(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabaseAdmin.from("profiles").select("organization_id, email").eq("id", userId).maybeSingle(),
    supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
  ]);
  const roleSet = new Set((roles ?? []).map((r) => r.role));
  return {
    supabaseAdmin,
    orgId: profile?.organization_id as string | undefined,
    email: profile?.email as string | undefined,
    isSuperAdmin: roleSet.has("super_admin"),
    isAdmin: roleSet.has("admin") || roleSet.has("super_admin"),
  };
}

export const getMyTenantContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = await loadContext(context.userId);
    const { data: org } = ctx.orgId
      ? await ctx.supabaseAdmin.from("organizations").select("*").eq("id", ctx.orgId).maybeSingle()
      : { data: null as any };
    const { data: roles } = await ctx.supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId);
    return {
      organization: org,
      roles: (roles ?? []).map((r) => r.role),
      isSuperAdmin: ctx.isSuperAdmin,
      isAdmin: ctx.isAdmin,
    };
  });

export const listOrganizations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = await loadContext(context.userId);
    if (!ctx.isSuperAdmin) throw new Error("Accès refusé (super admin requis)");
    const { data: orgs } = await ctx.supabaseAdmin.from("organizations").select("*").order("created_at", { ascending: false });
    const ids = (orgs ?? []).map((o) => o.id);
    const { data: members } = await ctx.supabaseAdmin
      .from("profiles")
      .select("organization_id, is_premium")
      .in("organization_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const byOrg = new Map<string, { members: number; premium: number }>();
    (members ?? []).forEach((p) => {
      const e = byOrg.get(p.organization_id) ?? { members: 0, premium: 0 };
      e.members += 1;
      if (p.is_premium) e.premium += 1;
      byOrg.set(p.organization_id, e);
    });
    return (orgs ?? []).map((o) => ({ ...o, ...byOrg.get(o.id) ?? { members: 0, premium: 0 } }));
  });

export const listOrgUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ organizationId: z.string().uuid().optional() }).parse)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    if (!ctx.isAdmin) throw new Error("Accès refusé");
    let targetOrg = ctx.orgId;
    if (data.organizationId && data.organizationId !== ctx.orgId) {
      if (!ctx.isSuperAdmin) throw new Error("Accès refusé à cette organisation");
      targetOrg = data.organizationId;
    }
    if (!targetOrg) throw new Error("Aucune organisation");

    const { data: users } = await ctx.supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, is_premium, created_at, organization_id")
      .eq("organization_id", targetOrg)
      .order("created_at", { ascending: false });

    const ids = (users ?? []).map((u) => u.id);
    const { data: roles } = await ctx.supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const rolesByUser = new Map<string, string[]>();
    (roles ?? []).forEach((r) => {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    });
    return (users ?? []).map((u) => ({ ...u, roles: rolesByUser.get(u.id) ?? [] }));
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    targetUserId: z.string().uuid(),
    role: z.enum(ROLES),
    action: z.enum(["add", "remove"]),
  }).parse)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    if (!ctx.isAdmin) throw new Error("Accès refusé");

    // F-04: any operation (add OR remove) on the super_admin role requires
    // super_admin privileges. Previously only `add` was guarded, allowing an
    // org admin to demote a platform super_admin embedded in their org.
    if (data.role === "super_admin" && !ctx.isSuperAdmin) {
      throw new Error("Seul un super admin peut gérer ce rôle");
    }

    // Prevent self-demotion lockout (admin removing their own admin role).
    if (data.targetUserId === context.userId && data.action === "remove" && data.role === "admin" && !ctx.isSuperAdmin) {
      throw new Error("Vous ne pouvez pas retirer votre propre rôle admin");
    }

    // Org admins may only manage users inside their own organization.
    if (!ctx.isSuperAdmin) {
      const { data: t } = await ctx.supabaseAdmin.from("profiles").select("organization_id").eq("id", data.targetUserId).maybeSingle();
      if (!t || t.organization_id !== ctx.orgId) throw new Error("Utilisateur hors de votre organisation");
    }

    if (data.action === "add") {
      const { error } = await ctx.supabaseAdmin.from("user_roles").upsert(
        { user_id: data.targetUserId, role: data.role },
        { onConflict: "user_id,role" },
      );
      if (error) throw new Error(error.message);
    } else {
      const { error } = await ctx.supabaseAdmin.from("user_roles").delete()
        .eq("user_id", data.targetUserId).eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    await ctx.supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId, user_email: ctx.email, organization_id: ctx.orgId,
      action: `role_${data.action}`, resource: data.targetUserId, metadata: { role: data.role },
    });
    return { ok: true };
  });

export const updateOrganizationPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ organizationId: z.string().uuid(), plan: z.enum(PLANS) }).parse)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    if (!ctx.isSuperAdmin) throw new Error("Accès refusé (super admin requis)");
    const { error } = await ctx.supabaseAdmin.from("organizations")
      .update({ plan: data.plan, updated_at: new Date().toISOString() })
      .eq("id", data.organizationId);
    if (error) throw new Error(error.message);
    await ctx.supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId, user_email: ctx.email, organization_id: data.organizationId,
      action: "org_plan_update", resource: data.organizationId, metadata: { plan: data.plan },
    });
    return { ok: true };
  });

export const renameOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    organizationId: z.string().uuid(),
    name: z.string().min(1).max(120),
  }).parse)
  .handler(async ({ context, data }) => {
    const ctx = await loadContext(context.userId);
    const canEdit = ctx.isSuperAdmin || (ctx.isAdmin && data.organizationId === ctx.orgId);
    if (!canEdit) throw new Error("Accès refusé");
    const { error } = await ctx.supabaseAdmin.from("organizations")
      .update({ name: data.name, updated_at: new Date().toISOString() })
      .eq("id", data.organizationId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
