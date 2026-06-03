import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const LogInput = z.object({
  action: z.string().min(1).max(100),
  resource: z.string().max(200).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  email: z.string().email().max(255).optional(),
  user_id: z.string().uuid().optional(),
});

// Public variant must never trust a caller-supplied user_id (audit log poisoning).
const PublicLogInput = LogInput.omit({ user_id: true });


/**
 * Public audit log endpoint (no auth required) — used for login/signup attempts
 * before a session exists. user_id stays null in those cases.
 */
export const logAuditPublic = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => LogInput.parse(d))
  .handler(async ({ data }) => {
    const ip = (() => {
      try { return getRequestIP({ xForwardedFor: true }) ?? null; } catch { return null; }
    })();
    const ua = (() => {
      try { return getRequestHeader("user-agent") ?? null; } catch { return null; }
    })();

    await supabaseAdmin.from("audit_logs").insert({
      user_id: data.user_id ?? null,
      user_email: data.email ?? null,
      action: data.action,
      resource: data.resource ?? null,
      metadata: (data.metadata ?? null) as any,
      ip_address: ip,
      user_agent: ua,
    });
    return { ok: true };
  });

/** Authenticated audit log — automatically attaches the current user. */
export const logAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => LogInput.parse(d))
  .handler(async ({ data, context }) => {
    const ip = (() => {
      try { return getRequestIP({ xForwardedFor: true }) ?? null; } catch { return null; }
    })();
    const ua = (() => {
      try { return getRequestHeader("user-agent") ?? null; } catch { return null; }
    })();

    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      user_email: data.email ?? (context.claims.email as string | undefined) ?? null,
      action: data.action,
      resource: data.resource ?? null,
      metadata: (data.metadata ?? null) as any,
      ip_address: ip,
      user_agent: ua,
    });
    return { ok: true };
  });

/** Admin-only: list recent audit logs (super_admin only — global view). */
export const getAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "super_admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Accès refusé : réservé aux super admins.");

    const { data, error } = await supabaseAdmin
      .from("audit_logs")
      .select("id, user_id, user_email, action, resource, metadata, ip_address, user_agent, created_at, organization_id")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { logs: data ?? [] };
  });
