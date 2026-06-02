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

// Map price lookup_key -> plan slug exposed in the app.
function priceToPlan(priceId?: string): "free" | "premium" | "business" {
  if (!priceId) return "free";
  if (priceId.startsWith("premium_")) return "premium";
  if (priceId.startsWith("business_")) return "business";
  // legacy keys
  if (priceId.startsWith("pro_")) return "premium";
  if (priceId.startsWith("enterprise_")) return "business";
  return "free";
}

async function applySubscription(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  const organizationId = subscription.metadata?.organizationId || null;
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.lookup_key || item?.price?.metadata?.lovable_external_id || item?.price?.id;
  const productId = typeof item?.price?.product === "string" ? item.price.product : item?.price?.product?.id;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;
  const plan = ["canceled", "incomplete_expired", "unpaid"].includes(subscription.status)
    ? "free"
    : priceToPlan(priceId);

  const sb = getSupabase();

  // --- F-12: customer/org integrity check ---
  if (organizationId) {
    const { data: org } = await sb
      .from("organizations").select("stripe_customer_id").eq("id", organizationId).maybeSingle();
    if (org && org.stripe_customer_id && org.stripe_customer_id !== subscription.customer) {
      await sb.from("audit_logs").insert({
        user_id: userId ?? null,
        organization_id: organizationId,
        action: "subscription_rejected_customer_mismatch",
        resource: subscription.id,
        metadata: { expected: org.stripe_customer_id, got: subscription.customer, env },
      });
      return;
    }
    await sb.from("organizations").update({
      stripe_customer_id: subscription.customer,
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      plan,
      updated_at: new Date().toISOString(),
    }).eq("id", organizationId);
  }

  if (userId) {
    await sb.from("profiles").update({ is_premium: plan !== "free" }).eq("id", userId);

    // Mirror into dedicated subscriptions table
    await sb.from("subscriptions").upsert({
      user_id: userId,
      organization_id: organizationId,
      stripe_customer_id: subscription.customer,
      stripe_subscription_id: subscription.id,
      product_id: productId ?? null,
      price_id: priceId ?? "unknown",
      plan,
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      environment: env,
      updated_at: new Date().toISOString(),
    }, { onConflict: "stripe_subscription_id" });
  }

  await sb.from("audit_logs").insert({
    user_id: userId ?? null,
    organization_id: organizationId ?? null,
    action: `subscription_${subscription.status}`,
    resource: subscription.id,
    metadata: { plan, price_id: priceId, env },
  });
}

async function recordPayment(invoice: any, env: StripeEnv) {
  // invoice.paid event: log into payments table
  const sb = getSupabase();
  const customer = invoice.customer;
  let userId: string | null = invoice.subscription_details?.metadata?.userId ?? null;
  let organizationId: string | null = invoice.subscription_details?.metadata?.organizationId ?? null;

  // Fallback: look up by stripe_customer_id in our subscriptions table.
  if (!userId && customer) {
    const { data: sub } = await sb
      .from("subscriptions").select("user_id, organization_id")
      .eq("stripe_customer_id", customer).limit(1).maybeSingle();
    if (sub) { userId = sub.user_id; organizationId = sub.organization_id; }
  }
  if (!userId) return; // anonymous payment - skip

  await sb.from("payments").upsert({
    user_id: userId,
    organization_id: organizationId,
    stripe_customer_id: customer,
    stripe_invoice_id: invoice.id,
    stripe_payment_intent_id: invoice.payment_intent ?? null,
    amount: invoice.amount_paid ?? 0,
    currency: (invoice.currency ?? "eur").toLowerCase(),
    payment_status: invoice.status ?? "paid",
    invoice_url: invoice.hosted_invoice_url ?? null,
    invoice_pdf: invoice.invoice_pdf ?? null,
    description: invoice.lines?.data?.[0]?.description ?? null,
    environment: env,
  }, { onConflict: "stripe_invoice_id" });
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
    case "invoice.paid":
    case "invoice.payment_succeeded":
      await recordPayment(event.data.object, env);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const hint = new URL(request.url).searchParams.get("env");
        const order: StripeEnv[] = hint === "live" ? ["live", "sandbox"] : ["sandbox", "live"];
        const rawBody = await request.text();
        const cloneRequest = (_env: StripeEnv) =>
          new Request(request.url, { method: request.method, headers: request.headers, body: rawBody });

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
        try {
          const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
          const ua = request.headers.get("user-agent") ?? null;
          await getSupabase().from("audit_logs").insert({
            user_id: null,
            action: "webhook_signature_invalid",
            resource: "stripe",
            ip_address: ip,
            user_agent: ua,
            metadata: { error: String(lastError).slice(0, 500), hint } as any,
          });
        } catch { /* never block webhook response on audit failure */ }
        return new Response("Webhook signature verification failed", { status: 400 });
      },
    },
  },
});
