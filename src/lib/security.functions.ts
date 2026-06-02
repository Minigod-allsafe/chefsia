import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Security monitoring — aggregates events from `audit_logs` to detect
 * abnormal activity. No new table needed: we already write security-
 * relevant events (login_failed, *_denied, webhook_signature_invalid,
 * subscription_rejected_*) into audit_logs.
 *
 * Alert rules:
 *  - >=5 login_failed for the same email in 15 min  → brute_force
 *  - >=3 *_denied for the same user in 10 min       → access_abuse
 *  - >=1 webhook_signature_invalid in 1 h           → webhook_tampering
 *  - >=1 subscription_rejected_customer_mismatch    → billing_tampering
 */

const SECURITY_ACTIONS = [
  "login_failed",
  "signup_failed",
  "access_denied",
  "permission_denied",
  "webhook_signature_invalid",
  "subscription_rejected_customer_mismatch",
  "role_change_denied",
  "invite_denied",
] as const;

async function assertSuperAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (!data) throw new Error("Accès refusé : réservé aux super admins.");
}

export const getSecurityOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.userId);

    const now = Date.now();
    const since24h = new Date(now - 24 * 3600_000).toISOString();
    const since7d = new Date(now - 7 * 86400_000).toISOString();

    const { data: logs, error } = await supabaseAdmin
      .from("audit_logs")
      .select("id, user_id, user_email, action, resource, ip_address, metadata, created_at")
      .gte("created_at", since7d)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);

    const all = logs ?? [];
    const security = all.filter((l) =>
      (SECURITY_ACTIONS as readonly string[]).includes(l.action) ||
      /failed|denied|invalid|rejected|tamper/i.test(l.action),
    );
    const last24h = security.filter((l) => l.created_at >= since24h);

    // ----- KPIs
    const kpis = {
      loginFailed24h: last24h.filter((l) => l.action === "login_failed").length,
      accessDenied24h: last24h.filter((l) => /denied/i.test(l.action)).length,
      webhookInvalid24h: last24h.filter((l) => /webhook_signature_invalid|subscription_rejected/i.test(l.action)).length,
      totalSecurity7d: security.length,
    };

    // ----- Time series (24h hourly)
    const buckets = new Map<string, { hour: string; login_failed: number; access_denied: number; webhook_invalid: number }>();
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now - i * 3600_000);
      const key = d.toISOString().slice(0, 13);
      buckets.set(key, {
        hour: `${String(d.getHours()).padStart(2, "0")}h`,
        login_failed: 0,
        access_denied: 0,
        webhook_invalid: 0,
      });
    }
    last24h.forEach((l) => {
      const key = l.created_at.slice(0, 13);
      const b = buckets.get(key);
      if (!b) return;
      if (l.action === "login_failed") b.login_failed++;
      else if (/denied/i.test(l.action)) b.access_denied++;
      else if (/webhook_signature_invalid|subscription_rejected/i.test(l.action)) b.webhook_invalid++;
    });
    const series = Array.from(buckets.values());

    // ----- Alert detection
    const alerts: Array<{
      id: string;
      severity: "critical" | "high" | "medium";
      type: string;
      message: string;
      count: number;
      target: string | null;
      lastSeen: string;
    }> = [];

    // Brute force: >=5 login_failed for same email within 15 min
    const since15 = now - 15 * 60_000;
    const byEmail = new Map<string, typeof security>();
    security
      .filter((l) => l.action === "login_failed" && new Date(l.created_at).getTime() >= since15)
      .forEach((l) => {
        const k = l.user_email ?? l.ip_address ?? "anon";
        const arr = byEmail.get(k) ?? [];
        arr.push(l);
        byEmail.set(k, arr);
      });
    byEmail.forEach((arr, email) => {
      if (arr.length >= 5) {
        alerts.push({
          id: `brute-${email}`,
          severity: "critical",
          type: "brute_force",
          message: `${arr.length} tentatives de connexion échouées (15 min)`,
          count: arr.length,
          target: email,
          lastSeen: arr[0].created_at,
        });
      }
    });

    // Access abuse: >=3 *_denied for same user within 10 min
    const since10 = now - 10 * 60_000;
    const byUser = new Map<string, typeof security>();
    security
      .filter((l) => /denied/i.test(l.action) && new Date(l.created_at).getTime() >= since10)
      .forEach((l) => {
        const k = l.user_email ?? l.user_id ?? l.ip_address ?? "anon";
        const arr = byUser.get(k) ?? [];
        arr.push(l);
        byUser.set(k, arr);
      });
    byUser.forEach((arr, user) => {
      if (arr.length >= 3) {
        alerts.push({
          id: `access-${user}`,
          severity: "high",
          type: "access_abuse",
          message: `${arr.length} accès refusés (10 min)`,
          count: arr.length,
          target: user,
          lastSeen: arr[0].created_at,
        });
      }
    });

    // Webhook tampering: any invalid webhook in last hour
    const since1h = now - 3600_000;
    const webhookIssues = security.filter(
      (l) =>
        /webhook_signature_invalid|subscription_rejected/i.test(l.action) &&
        new Date(l.created_at).getTime() >= since1h,
    );
    if (webhookIssues.length > 0) {
      alerts.push({
        id: "webhook-tamper",
        severity: webhookIssues.some((w) => /rejected/i.test(w.action)) ? "critical" : "high",
        type: "webhook_tampering",
        message: `${webhookIssues.length} webhook(s) Stripe invalide(s) ou rejeté(s) (1 h)`,
        count: webhookIssues.length,
        target: null,
        lastSeen: webhookIssues[0].created_at,
      });
    }

    // Top offending IPs
    const ipCounts = new Map<string, number>();
    security.forEach((l) => {
      if (!l.ip_address) return;
      ipCounts.set(l.ip_address, (ipCounts.get(l.ip_address) ?? 0) + 1);
    });
    const topIps = Array.from(ipCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));

    return {
      kpis,
      series,
      alerts: alerts.sort((a, b) => {
        const w = { critical: 0, high: 1, medium: 2 } as const;
        return w[a.severity] - w[b.severity];
      }),
      recent: security.slice(0, 50),
      topIps,
    };
  });
