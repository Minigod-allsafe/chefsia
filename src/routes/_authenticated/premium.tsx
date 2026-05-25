import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getUsageToday, upgradeToPremium } from "@/lib/ai-chef.functions";
import { Button } from "@/components/ui/button";
import { Check, Crown, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/premium")({
  component: PremiumPage,
});

function PremiumPage() {
  const fetchUsage = useServerFn(getUsageToday);
  const upgrade = useServerFn(upgradeToPremium);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["usage"], queryFn: () => fetchUsage() });
  const isPremium = data?.isPremium ?? false;

  const mut = useMutation({
    mutationFn: () => upgrade(),
    onSuccess: () => {
      toast.success("🎉 Bienvenue dans Premium !");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-10">
      <header className="text-center">
        <Crown className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-4 font-display text-4xl font-bold">Passez Premium</h1>
        <p className="mt-2 text-muted-foreground">
          Cuisinez sans limite. Apprenez sans frontière.
        </p>
      </header>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-8">
          <h3 className="text-2xl font-semibold">Free</h3>
          <p className="mt-1 text-sm text-muted-foreground">Votre plan actuel</p>
          <div className="mt-6 text-4xl font-bold">0€</div>
          <ul className="mt-6 space-y-3 text-sm">
            <Row text="3 requêtes Chef IA / jour" />
            <Row text="Cours gratuits uniquement" />
            <Row text="Suivi de progression" />
          </ul>
        </div>

        <div className="relative rounded-2xl border-2 border-primary bg-gradient-to-b from-card to-card/50 p-8 shadow-glow">
          <span className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            Recommandé
          </span>
          <h3 className="text-2xl font-semibold flex items-center gap-2">
            Premium <Sparkles className="h-5 w-5 text-primary" />
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">Tout débloqué</p>
          <div className="mt-6 flex items-baseline gap-1">
            <span className="text-5xl font-bold text-gradient-hero">10$</span>
            <span className="text-muted-foreground">/mois</span>
          </div>
          <ul className="mt-6 space-y-3 text-sm">
            <Row text="Chef IA illimité" highlight />
            <Row text="Tous les cours premium" highlight />
            <Row text="Nouveaux cours chaque mois" highlight />
            <Row text="Support prioritaire" highlight />
          </ul>
          <Button
            className="mt-8 w-full shadow-glow"
            size="lg"
            disabled={isPremium || mut.isPending}
            onClick={() => mut.mutate()}
          >
            {isPremium ? "Vous êtes Premium ✨" : mut.isPending ? "Activation…" : "Passer Premium"}
          </Button>
          {!isPremium && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Démo : activation immédiate sans paiement.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ text, highlight }: { text: string; highlight?: boolean }) {
  return (
    <li className="flex items-start gap-2">
      <Check className={`mt-0.5 h-4 w-4 ${highlight ? "text-primary" : "text-muted-foreground"}`} />
      <span>{text}</span>
    </li>
  );
}
