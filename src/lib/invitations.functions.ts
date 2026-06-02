import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = ["admin", "manager", "user"] as const;

async function loadCtx(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabaseAdmin.from("profiles").select("organization_id, email").eq("id", userId).maybeSingle(),
    supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
  ]);
  const set = new Set((roles ?? []).map((r) => r.role));
  return {
    supabaseAdmin,
    orgId: profile?.organization_id as string | undefined,
    email: profile?.email as string | undefined,
    isAdmin: set.has("admin") || set.has("super_admin"),
    isSuperAdmin: set.has("super_admin"),
  };
}

export const listInvitations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const c = await loadCtx(context.userId);
    if (!c.isAdmin || !c.orgId) throw new Error("Accès refusé");
    const { data } = await c.supabaseAdmin
      .from("invitations")
      .select("*")
      .eq("organization_id", c.orgId)
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const createInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    email: z.string().email().max(255),
    role: z.enum(ROLES),
  }).parse)
  .handler(async ({ context, data }) => {
    const c = await loadCtx(context.userId);
    if (!c.isAdmin || !c.orgId) throw new Error("Accès refusé");
    const { data: inv, error } = await c.supabaseAdmin
      .from("invitations")
      .insert({
        organization_id: c.orgId,
        email: data.email.toLowerCase(),
        role: data.role,
        invited_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await c.supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId, user_email: c.email, organization_id: c.orgId,
      action: "invitation_created", resource: inv.id, metadata: { email: data.email, role: data.role },
    });
    return inv;
  });

export const revokeInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }) => {
    const c = await loadCtx(context.userId);
    if (!c.isAdmin || !c.orgId) throw new Error("Accès refusé");
    const { error } = await c.supabaseAdmin
      .from("invitations").delete()
      .eq("id", data.id).eq("organization_id", c.orgId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Public: lookup invitation by token (used pre-auth on accept page)
export const lookupInvitation = createServerFn({ method: "GET" })
  .inputValidator(z.object({ token: z.string().min(10).max(200) }).parse)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv } = await supabaseAdmin
      .from("invitations")
      .select("id, email, role, organization_id, accepted_at, expires_at, organizations(name)")
      .eq("token", data.token)
      .maybeSingle();
    if (!inv) return { ok: false as const, reason: "not_found" };
    if (inv.accepted_at) return { ok: false as const, reason: "already_used" };
    if (new Date(inv.expires_at) < new Date()) return { ok: false as const, reason: "expired" };
    return {
      ok: true as const,
      email: inv.email,
      role: inv.role,
      organizationName: (inv as any).organizations?.name ?? "—",
    };
  });

// Accept invitation (auth required): moves user into org + assigns role.
// Strictly intra-organization: wipes ALL prior roles to prevent privilege
// carry-over from a previous org (e.g. the default `admin` granted by the
// handle_new_user trigger on the user's solo workspace).
export const acceptInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ token: z.string().min(10).max(200) }).parse)
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inv } = await supabaseAdmin
      .from("invitations").select("*").eq("token", data.token).maybeSingle();
    if (!inv) throw new Error("Invitation introuvable");
    if (inv.accepted_at) throw new Error("Invitation déjà utilisée");
    if (new Date(inv.expires_at) < new Date()) throw new Error("Invitation expirée");

    // Defense-in-depth: invitations may never grant super_admin, and only the
    // intra-org roles are accepted (the create path already enforces this).
    const ALLOWED_ROLES = new Set(["admin", "manager", "user"]);
    if (!ALLOWED_ROLES.has(inv.role as string)) {
      throw new Error("Rôle d'invitation non autorisé");
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles").select("id, email, organization_id").eq("id", context.userId).maybeSingle();
    if (!profile) throw new Error("Profil introuvable");
    // Email MUST exist and match — a null email cannot accept arbitrary invites.
    if (!profile.email) throw new Error("Email du compte requis pour accepter l'invitation.");
    if (profile.email.toLowerCase() !== inv.email.toLowerCase()) {
      throw new Error("Cette invitation a été émise pour un autre email.");
    }

    const previousOrgId = profile.organization_id;

    // CRITICAL: wipe every existing role before joining the destination org.
    // Prevents the `admin` role granted on the user's previous solo workspace
    // (or any other prior org) from leaking into the new tenant.
    await supabaseAdmin.from("user_roles").delete().eq("user_id", context.userId);

    // Move user to the invitation's org.
    await supabaseAdmin.from("profiles")
      .update({ organization_id: inv.organization_id })
      .eq("id", context.userId);

    // Assign ONLY the invitation's role, strictly within the destination org.
    const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({
      user_id: context.userId,
      role: inv.role,
    });
    if (roleErr) throw new Error(roleErr.message);

    await supabaseAdmin.from("invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", inv.id);

    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      user_email: profile.email,
      organization_id: inv.organization_id,
      action: "invitation_accepted",
      resource: inv.id,
      metadata: {
        role: inv.role,
        previous_organization_id: previousOrgId,
        roles_reset: true,
      },
    });
    return { ok: true, organizationId: inv.organization_id };
  });
