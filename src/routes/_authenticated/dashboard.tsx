import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getUsageToday } from "@/lib/ai-chef.functions";
import { listCoursesWithProgress } from "@/lib/courses.functions";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Sparkles, Crown, GraduationCap, ChefHat, Package, AlertTriangle, HelpCircle, Trash2 } from "lucide-react";

const PACKAGE_STATS = [
  { label: "Packages totaux", value: 142, icon: Package },
  { label: "Packages critiques", value: 5, icon: AlertTriangle },
  { label: "Packages inconnus", value: 8, icon: HelpCircle },
  { label: "Packages inutilisés", value: 12, icon: Trash2 },
];

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardHome,
});

const SUGGESTIONS = [
  "Une recette de tarte au citron meringuée parfaite",
  "Comment réussir des macarons à coque lisse ?",
  "Idée de dîner rapide avec du saumon",
  "Recette de pain au levain maison",
];

function DashboardHome() {
  const fetchUsage = useServerFn(getUsageToday);
  const fetchCourses = useServerFn(listCoursesWithProgress);

  const usageQ = useQuery({ queryKey: ["usage"], queryFn: () => fetchUsage() });
  const coursesQ = useQuery({ queryKey: ["courses-progress"], queryFn: () => fetchCourses() });

  const name = usageQ.data?.fullName?.split(" ")[0] ?? "Chef";
  const isPremium = usageQ.data?.isPremium ?? false;
  const used = usageQ.data?.used ?? 0;
  const limit = usageQ.data?.limit ?? 3;

  const courses = coursesQ.data?.courses ?? [];
  const completed = courses.filter((c) => c.progress_pct >= 100).length;
  const avg = courses.length
    ? Math.round(courses.reduce((a, c) => a + c.progress_pct, 0) / courses.length)
    : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-10">
      <header>
        <h1 className="font-display text-4xl font-bold">Bonjour {name} 👋</h1>
        <p className="mt-1 text-muted-foreground">Prêt à cuisiner quelque chose d'exceptionnel ?</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Chef IA aujourd'hui</span>
          </div>
          <p className="mt-3 text-3xl font-bold">
            {isPremium ? "∞" : `${used}/${limit}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {isPremium ? "Illimité avec Premium" : "Requêtes restantes : " + Math.max(0, limit - used)}
          </p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Progression cours</span>
          </div>
          <p className="mt-3 text-3xl font-bold">{avg}%</p>
          <Progress value={avg} className="mt-2" />
          <p className="mt-1 text-xs text-muted-foreground">{completed}/{courses.length} terminés</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <Crown className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Plan</span>
          </div>
          <p className="mt-3 text-3xl font-bold">{isPremium ? "Premium" : "Free"}</p>
          {!isPremium && (
            <Link to="/billing">
              <Button size="sm" className="mt-2 w-full">Passer Premium</Button>
            </Link>
          )}
        </Card>
      </div>

      <section>
        <h2 className="font-display text-2xl font-semibold">Statistiques des packages</h2>
        <p className="mt-1 text-sm text-muted-foreground">Aperçu des packages du projet</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PACKAGE_STATS.map(({ label, value, icon: Icon }) => (
            <Card key={label} className="p-5">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{label}</span>
              </div>
              <p className="mt-3 text-3xl font-bold">{value}</p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold">Suggestions de recettes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cliquez pour demander au Chef IA
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {SUGGESTIONS.map((s) => (
            <Link
              key={s}
              to="/chef"
              search={{ q: s }}
              className="group flex items-start gap-3 rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-glow"
            >
              <ChefHat className="mt-0.5 h-5 w-5 text-primary shrink-0" />
              <span className="text-sm">{s}</span>
            </Link>
          ))}
        </div>
      </section>

      {!isPremium && (
        <section className="rounded-2xl border-2 border-primary bg-gradient-to-r from-primary/10 to-transparent p-8 shadow-glow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-2xl font-bold">Débloquez tout votre potentiel</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Chef IA illimité · Tous les cours premium · 10$/mois
              </p>
            </div>
            <Link to="/billing">
              <Button size="lg" className="shadow-glow">Passer Premium</Button>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
