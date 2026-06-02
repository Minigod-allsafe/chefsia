import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Crown, Sparkles, Users, Download } from "lucide-react";
import { getMyTenantContext } from "@/lib/tenants.functions";
import { createPortalSession, getStripeData } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/billing")({ component: BillingPage });

type PlanId = "free" | "premium" | "business";

const PLANS: Array<{
  id: PlanId;
  name: string;
  monthly: number;
  yearly: number;
  icon: typeof Sparkles;
  highlight?: boolean;
  features: string[];
  priceIds: { monthly: string | null; yearly: string | null };
}> = [
  {
    id: "free", name: "Gratuit", monthly: 0, yearly: 0, icon: Check,
    features: [
      "3 générations vidéo / jour",
      "Chef IA basique",
      "Cours gratuits",
      "Watermark ChefIA",
    ],
    priceIds: { monthly: null, yearly: null },
  },
  {
    id: "premium", name: "Premium", monthly: 9.99, yearly: 99, icon: Sparkles, highlight: true,
    features: [
      "Générations vidéo augmentées",
      "Chef IA illimité",
      "Export HD",
      "Sans watermark",
      "Tous les cours premium",
      "Support prioritaire",
    ],
    priceIds: { monthly: "premium_monthly", yearly: "premium_yearly" },
  },
  {
    id: "business", name: "Business", monthly: 29.99, yearly: 299, icon: Users,
    features: [
      "Tout Premium inclus",
      "Accès équipe (jusqu'à 25 membres)",
      "Générations avancées illimitées",
      "Usage élevé / quotas étendus",
      "Journal d'audit avancé",
      "Support dédié",
    ],
    priceIds: { monthly: "business_monthly", yearly: "business_yearly" },
  },
];

function fmtEUR(v: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(v);
}

function BillingPage() {
  const fetchCtx = useServerFn(getMyTenantContext);
  const fetchStripe = useServerFn(getStripeData);
  const portal = useServerFn(createPortalSession);

  const { data: ctx } = useQuery({ queryKey: ["tenant-ctx"], queryFn: () => fetchCtx() });
  const { data: stripeData } = useQuery({
    queryKey: ["stripe-data"],
    queryFn: () => fetchStripe({ data: { environment: getStripeEnvironment() } }),
  });

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

  const currentPlan = (ctx?.organization?.plan ?? "free") as PlanId;
  const invoices = stripeData && !("error" in stripeData) ? stripeData.invoices : [];

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
            <CreditCard className="h-8 w-8 text-primary" /> Abonnement & paiements
          </h1>
          <p className="mt-1 text-muted-foreground">
            Plan actuel : <Badge className="ml-1 capitalize">{currentPlan}</Badge>
            {ctx?.organization?.current_period_end && (
              <span className="ml-2 text-xs">
                · renouvellement le {new Date(ctx.organization.current_period_end).toLocaleDateString("fr-FR")}
              </span>
            )}
            {ctx?.organization?.subscription_status && (
              <span className="ml-2 text-xs">· statut {ctx.organization.subscription_status}</span>
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
          const Icon = p.icon;
          const isCurrent = currentPlan === p.id;
          const priceId = p.priceIds[interval];
          const amount = interval === "monthly" ? p.monthly : p.yearly;
          return (
            <Card key={p.id} className={`flex flex-col p-6 ${p.highlight ? "border-primary shadow-glow" : ""}`}>
              {p.highlight && (
                <Badge className="mb-2 self-start"><Crown className="mr-1 h-3 w-3" />Recommandé</Badge>
              )}
              <h3 className="flex items-center gap-2 font-display text-2xl font-bold">
                <Icon className="h-5 w-5 text-primary" /> {p.name}
              </h3>
              <p className="mt-2 text-3xl font-bold">
                {p.id === "free" ? "0 €" : fmtEUR(amount)}
                <span className="text-sm font-normal text-muted-foreground">
                  {p.id === "free" ? "" : interval === "yearly" ? " / an" : " / mois"}
                </span>
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6 w-full"
                variant={p.highlight ? "default" : "outline"}
                disabled={isCurrent || !priceId}
                onClick={() => priceId && setCheckoutPriceId(priceId)}
              >
                {isCurrent ? "Plan actuel" : !priceId ? "Plan gratuit" : "Passer au " + p.name}
              </Button>
            </Card>
          );
        })}
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-2xl font-semibold">Historique des paiements</h2>
        {!stripeData && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {stripeData && "error" in stripeData && (
          <p className="text-sm text-destructive">{stripeData.error}</p>
        )}
        {stripeData && !("error" in stripeData) && invoices.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun paiement enregistré.</p>
        )}
        {invoices.length > 0 && (
          <Card className="divide-y">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium">
                    {fmtEUR(inv.amount_paid)}{" "}
                    <Badge variant={inv.status === "paid" ? "default" : "secondary"} className="ml-2">
                      {inv.status ?? "—"}
                    </Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {inv.created ? new Date(inv.created).toLocaleString("fr-FR") : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  {inv.hosted_invoice_url && (
                    <Button asChild size="sm" variant="outline">
                      <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer">Voir</a>
                    </Button>
                  )}
                  {inv.pdf_url && (
                    <Button asChild size="sm" variant="ghost">
                      <a href={inv.pdf_url} target="_blank" rel="noreferrer">
                        <Download className="mr-1 h-4 w-4" /> PDF
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </Card>
        )}
      </section>

      <p className="text-center text-xs text-muted-foreground">
        Paiements sécurisés par Stripe · Visa, Mastercard et autres cartes acceptées · TVA gérée automatiquement.
        <br />
        <Link to="/pricing" className="underline">Voir la grille tarifaire publique</Link>
      </p>
    </div>
  );
}
