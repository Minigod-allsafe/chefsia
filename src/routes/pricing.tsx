import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Check, Crown, Sparkles, Users, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Tarifs ChefIA — Premium & Business" },
      { name: "description", content: "Comparez les plans ChefIA : Gratuit, Premium 9,99€/mois, Business 29,99€/mois. Paiement sécurisé par carte bancaire." },
      { property: "og:title", content: "Tarifs ChefIA" },
      { property: "og:description", content: "Cuisinez avec l'IA. Plans à partir de 9,99€/mois. Paiement sécurisé." },
    ],
  }),
});

const PLANS = [
  {
    id: "free", name: "Gratuit", monthly: 0, yearly: 0, icon: Check,
    tagline: "Pour découvrir ChefIA",
    features: [
      "3 générations vidéo par jour",
      "Chef IA basique",
      "Cours gratuits",
      "Watermark ChefIA",
    ],
  },
  {
    id: "premium", name: "Premium", monthly: 9.99, yearly: 99, icon: Sparkles, highlight: true,
    tagline: "Pour les passionnés",
    features: [
      "Générations vidéo augmentées",
      "Chef IA illimité",
      "Export vidéo HD",
      "Sans watermark",
      "Tous les cours premium",
      "Support prioritaire",
    ],
  },
  {
    id: "business", name: "Business", monthly: 29.99, yearly: 299, icon: Users,
    tagline: "Pour les équipes & restaurants",
    features: [
      "Tout Premium inclus",
      "Accès équipe (jusqu'à 25 membres)",
      "Quotas étendus",
      "Journal d'audit avancé",
      "Support dédié",
    ],
  },
];

const fmt = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(v);

function PricingPage() {
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl space-y-12 px-4 py-12 md:py-20">
        <header className="text-center">
          <Badge variant="secondary" className="mb-4">Tarification simple</Badge>
          <h1 className="font-display text-4xl font-bold md:text-5xl">Cuisinez sans limite</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Choisissez le plan qui vous correspond. Annulable à tout moment, sans engagement.
          </p>
        </header>

        <div className="flex justify-center gap-2">
          <Button size="sm" variant={interval === "monthly" ? "default" : "outline"} onClick={() => setInterval("monthly")}>
            Mensuel
          </Button>
          <Button size="sm" variant={interval === "yearly" ? "default" : "outline"} onClick={() => setInterval("yearly")}>
            Annuel <Badge variant="secondary" className="ml-2">-17%</Badge>
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((p) => {
            const Icon = p.icon;
            const amount = interval === "monthly" ? p.monthly : p.yearly;
            return (
              <Card key={p.id} className={`flex flex-col p-6 ${p.highlight ? "border-2 border-primary shadow-glow" : ""}`}>
                {p.highlight && (
                  <Badge className="mb-2 self-start"><Crown className="mr-1 h-3 w-3" />Recommandé</Badge>
                )}
                <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
                  <Icon className="h-5 w-5 text-primary" /> {p.name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
                <p className="mt-4 text-4xl font-bold">
                  {p.id === "free" ? "0 €" : fmt(amount)}
                  <span className="text-sm font-normal text-muted-foreground">
                    {p.id === "free" ? "" : interval === "yearly" ? " / an" : " / mois"}
                  </span>
                </p>
                <ul className="mt-6 flex-1 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{f}
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-6 w-full" variant={p.highlight ? "default" : "outline"}>
                  <Link to="/billing">
                    {p.id === "free" ? "Commencer gratuitement" : `Passer au ${p.name}`}
                  </Link>
                </Button>
              </Card>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Paiement sécurisé SSL · Stripe</div>
          <div>Visa · Mastercard · Apple Pay · Google Pay · TVA calculée automatiquement</div>
        </div>
      </div>
    </div>
  );
}
