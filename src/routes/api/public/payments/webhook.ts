import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

let _supabase: any = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _supabase;
}

// Map price_id (lookup_key) -> plan
function priceToPlan(priceId?: string): "free" | "pro" | "enterprise" {
  if (!priceId) return "free";
  if (priceId.startsWith("pro_")) return "pro";
  if (priceId.startsWith("enterprise_")) return "enterprise";
  return "free";
}

async function applySubscription(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  const organizationId = subscription.metadata?.organizationId;
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.lookup_key || item?.price?.metadata?.lovable_external_id || item?.price?.id;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;
  const plan = ["canceled", "incomplete_expired", "unpaid"].includes(subscription.status) ? "free" : priceToPlan(priceId);

  if (organizationId) {
    // F-12: verify the Stripe customer matches the org's stored customer
    // before mutating. If the org has no customer yet (first subscription),
    // accept and bind. If it has a different customer, reject — prevents a
    // tampered metadata.organizationId from hijacking another tenant's plan.
    const { data: org } = await getSupabase()
      .from("organizations")
      .select("stripe_customer_id")
      .eq("id", organizationId)
      .maybeSingle();

    if (org && org.stripe_customer_id && org.stripe_customer_id !== subscription.customer) {
      console.warn("Webhook: customer/org mismatch — refusing apply", {
        org: organizationId, expected: org.stripe_customer_id, got: subscription.customer,
      });
      await getSupabase().from("audit_logs").insert({
        user_id: userId ?? null,
        organization_id: organizationId,
        action: "subscription_rejected_customer_mismatch",
        resource: subscription.id,
        metadata: { expected: org.stripe_customer_id, got: subscription.customer, env },
      });
      return;
    }

    await getSupabase().from("organizations").update({
      stripe_customer_id: subscription.customer,
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      plan,
      updated_at: new Date().toISOString(),
    }).eq("id", organizationId);
  }
  if (userId) {
    await getSupabase().from("profiles").update({ is_premium: plan !== "free" }).eq("id", userId);
  }
  await getSupabase().from("audit_logs").insert({
    user_id: userId ?? null,
    organization_id: organizationId ?? null,
    action: `subscription_${subscription.status}`,
    resource: subscription.id,
    metadata: { plan, price_id: priceId, env },
  });
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await applySubscription(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await applySubscription({ ...event.data.object, status: "canceled" }, env);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // F-08: do NOT trust ?env= alone. Try sandbox first, then live; whichever
        // secret produces a valid HMAC signature determines the true environment.
        // The query param is kept only as an optimisation hint.
        const hint = new URL(request.url).searchParams.get("env");
        const order: StripeEnv[] = hint === "live"
          ? ["live", "sandbox"]
          : ["sandbox", "live"];

        // Clone body once so we can retry signature verification with each secret.
        const rawBody = await request.text();
        const cloneRequest = (env: StripeEnv) =>
          new Request(request.url, {
            method: request.method,
            headers: request.headers,
            body: rawBody,
          });

        let lastError: unknown = null;
        for (const env of order) {
          try {
            await handleWebhook(cloneRequest(env), env);
            return Response.json({ received: true, env });
          } catch (e) {
            lastError = e;
          }
        }
        console.error("Webhook error (all envs failed):", lastError);
        return new Response("Webhook signature verification failed", { status: 400 });
      },
    },
  },
});
