import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";

const StripeEnvSchema = z.enum(['sandbox', 'live']);

// F-11: server-side allowlist of Stripe price lookup_keys. Only these are
// purchasable; arbitrary lookup_keys present in the Stripe account (test SKUs,
// 1¢ trials, archived discounts) cannot be selected by the client.
const ALLOWED_PRICE_LOOKUP_KEYS = new Set([
  "premium_monthly", "premium_yearly",
  "business_monthly", "business_yearly",
  // legacy keys kept temporarily for in-flight checkout sessions
  "pro_monthly", "pro_yearly",
  "enterprise_monthly", "enterprise_yearly",
]);

type CheckoutResult = { clientSecret: string } | { error: string };
type PortalResult = { url: string } | { error: string };

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`, limit: 1,
    });
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (options.userId && customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    priceId: z.string().regex(/^[a-zA-Z0-9_-]+$/),
    returnUrl: z.string().url(),
    environment: StripeEnvSchema,
  }).parse)
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    try {
      if (!ALLOWED_PRICE_LOOKUP_KEYS.has(data.priceId)) {
        return { error: "Plan invalide" };
      }
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profile } = await supabaseAdmin
        .from("profiles").select("email, organization_id").eq("id", context.userId).maybeSingle();

      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      if (!prices.data.length) throw new Error("Price not found");
      const stripePrice = prices.data[0];
      const isRecurring = stripePrice.type === "recurring";

      const customerId = await resolveOrCreateCustomer(stripe, {
        email: profile?.email ?? undefined,
        userId: context.userId,
      });

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: isRecurring ? "subscription" : "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        metadata: {
          userId: context.userId,
          organizationId: profile?.organization_id ?? "",
        },
        ...(isRecurring && {
          subscription_data: {
            metadata: {
              userId: context.userId,
              organizationId: profile?.organization_id ?? "",
            },
          },
        }),
      });
      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    returnUrl: z.string().url(),
    environment: StripeEnvSchema,
  }).parse)
  .handler(async ({ data, context }): Promise<PortalResult> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profile } = await supabaseAdmin
        .from("profiles").select("organization_id").eq("id", context.userId).maybeSingle();
      if (!profile?.organization_id) throw new Error("Aucune organisation");

      const { data: org } = await supabaseAdmin
        .from("organizations").select("stripe_customer_id").eq("id", profile.organization_id).maybeSingle();
      if (!org?.stripe_customer_id) throw new Error("Aucun abonnement actif");

      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: org.stripe_customer_id,
        return_url: data.returnUrl,
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
