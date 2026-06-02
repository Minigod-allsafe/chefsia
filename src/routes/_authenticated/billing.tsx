import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Crown } from "lucide-react";
import { getMyTenantContext } from "@/lib/tenants.functions";
import { createPortalSession } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/billing")({ component: BillingPage });

const PLANS = [
  {
    id: "free", name: "Free", price: "0 €", interval: "",
    features: ["Chef IA basique", "Accès cours gratuits", "1 utilisateur"],
    priceIds: { monthly: null, yearly: null },
  },
  {
    id: "pro", name: "Pro", price: "19 €", interval: "/ mois",
    features: ["Chef IA illimité", "Cours premium", "Support prioritaire", "Jusqu'à 10 membres"],
    priceIds: { monthly: "pro_monthly", yearly: "pro_yearly" },
    highlight: true,
  },
  {
    id: "enterprise", name: "Enterprise", price: "99 €", interval: "/ mois",
    features: ["Utilisateurs illimités", "SSO", "Journal d'audit avancé", "Support dédié"],
    priceIds: { monthly: "enterprise_monthly", yearly: "enterprise_yearly" },
  },
];

function BillingPage() {
  const fetchCtx = useServerFn(getMyTenantContext);
  const portal = useServerFn(createPortalSession);
  const { data: ctx } = useQuery({ queryKey: ["tenant-ctx"], queryFn: () => fetchCtx() });
  const [checkoutPriceId, setCheckoutPriceId] = useState<string | null>(null);
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");

  const openPortal = async () => {
    try {
      const r = await portal({ data: { returnUrl: window.location.href, environment: getStripeEnvironment() } });
      if ("error" in r) throw new Error(r.error);
      window.open(r.url, "_blank");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const currentPlan = ctx?.organization?.plan ?? "free";

  if (checkoutPriceId) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <PaymentTestModeBanner />
        <Button variant="ghost" onClick={() => setCheckoutPriceId(null)}>← Retour</Button>
        <StripeEmbeddedCheckout
          priceId={checkoutPriceId}
          returnUrl={`${window.location.origin}/billing?success=1`}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      <PaymentTestModeBanner />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-4xl font-bold">
            <CreditCard className="h-8 w-8 text-primary" /> Abonnement
          </h1>
          <p className="mt-1 text-muted-foreground">
            Plan actuel : <Badge className="ml-1">{currentPlan}</Badge>
            {ctx?.organization?.current_period_end && (
              <span className="ml-2 text-xs">jusqu'au {new Date(ctx.organization.current_period_end).toLocaleDateString("fr-FR")}</span>
            )}
          </p>
        </div>
        {ctx?.organization?.stripe_customer_id && (
          <Button variant="outline" onClick={openPortal}>Gérer mon abonnement</Button>
        )}
      </header>

      <div className="flex justify-center gap-2">
        <Button size="sm" variant={interval === "monthly" ? "default" : "outline"} onClick={() => setInterval("monthly")}>Mensuel</Button>
        <Button size="sm" variant={interval === "yearly" ? "default" : "outline"} onClick={() => setInterval("yearly")}>
          Annuel <Badge variant="secondary" className="ml-2">-17%</Badge>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = currentPlan === p.id;
          const priceId = p.priceIds[interval];
          return (
            <Card key={p.id} className={`p-6 ${p.highlight ? "border-primary shadow-glow" : ""}`}>
              {p.highlight && <Badge className="mb-2"><Crown className="mr-1 h-3 w-3" />Recommandé</Badge>}
              <h3 className="font-display text-2xl font-bold">{p.name}</h3>
              <p className="mt-2 text-3xl font-bold">
                {p.id === "free" ? "0 €" : interval === "yearly" ? (p.id === "pro" ? "190 €" : "990 €") : p.price}
                <span className="text-sm font-normal text-muted-foreground">{p.id === "free" ? "" : interval === "yearly" ? " / an" : " / mois"}</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-primary shrink-0" />{f}</li>
                ))}
              </ul>
              <Button
                className="mt-6 w-full"
                variant={p.highlight ? "default" : "outline"}
                disabled={isCurrent || !priceId}
                onClick={() => priceId && setCheckoutPriceId(priceId)}
              >
                {isCurrent ? "Plan actuel" : !priceId ? "Plan gratuit" : "Choisir"}
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
