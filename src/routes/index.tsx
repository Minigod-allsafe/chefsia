import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ChefHat, Sparkles, GraduationCap, Check } from "lucide-react";
import heroChef from "@/assets/hero-chef.jpg";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="absolute top-0 z-20 w-full">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2 font-display text-xl font-bold">
            <ChefHat className="h-6 w-6 text-primary" />
            <span>Chef IA</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Connexion
            </Link>
            <Link to="/signup">
              <Button size="sm">Commencer</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate min-h-screen overflow-hidden">
        <img
          src={heroChef}
          alt="Chef cuisinant un plat raffiné"
          width={1536}
          height={1024}
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-50"
        />
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(180deg, oklch(0.14 0.01 60 / 0.6) 0%, oklch(0.14 0.01 60 / 0.95) 100%)",
          }}
        />
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Propulsé par l'IA culinaire
          </span>
          <h1 className="font-display text-5xl font-bold leading-[1.05] sm:text-7xl">
            Votre <span className="text-gradient-hero">chef personnel</span>
            <br /> alimenté par l'IA
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Recettes sur-mesure, conseils d'experts, cours vidéo style Masterclass. La cuisine et la
            pâtisserie comme vous ne les avez jamais apprises.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/signup">
              <Button size="lg" className="shadow-glow">
                Démarrer gratuitement
              </Button>
            </Link>
            <a href="#pricing">
              <Button size="lg" variant="outline">
                Voir les tarifs
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-center font-display text-4xl font-bold">Tout pour cuisiner comme un pro</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted-foreground">
          Une expérience culinaire premium, accessible à tous.
        </p>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Sparkles,
              title: "Chef IA conversationnel",
              text: "Posez n'importe quelle question culinaire, obtenez recettes détaillées, étapes, conseils et temps de préparation.",
            },
            {
              icon: GraduationCap,
              title: "Cours vidéo premium",
              text: "Techniques de pâtisserie, sauces mères, cuissons parfaites. Style Masterclass + Netflix.",
            },
            {
              icon: ChefHat,
              title: "Progression personnelle",
              text: "Suivez votre apprentissage, débloquez des recettes, devenez le chef que vous rêvez d'être.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border bg-card p-7 shadow-card-premium transition hover:border-primary/40"
            >
              <f.icon className="h-8 w-8 text-primary transition group-hover:scale-110" />
              <h3 className="mt-5 text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t bg-card/30 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-display text-4xl font-bold">Tarification simple</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Commencez gratuitement. Passez au Premium quand vous êtes prêt.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border bg-card p-8 shadow-card-premium">
              <h3 className="text-2xl font-semibold">Free</h3>
              <p className="mt-1 text-sm text-muted-foreground">Pour découvrir</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-bold">0€</span>
                <span className="text-muted-foreground">/mois</span>
              </div>
              <ul className="mt-8 space-y-3 text-sm">
                {["3 requêtes Chef IA / jour", "Accès aux cours gratuits", "Suivi de progression"].map(
                  (item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-primary" /> {item}
                    </li>
                  ),
                )}
              </ul>
              <Link to="/signup" className="mt-8 block">
                <Button variant="outline" className="w-full">
                  Créer mon compte
                </Button>
              </Link>
            </div>

            <div className="relative rounded-2xl border-2 border-primary bg-gradient-to-b from-card to-card/50 p-8 shadow-glow">
              <span className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                Recommandé
              </span>
              <h3 className="text-2xl font-semibold">Premium</h3>
              <p className="mt-1 text-sm text-muted-foreground">Pour devenir un chef</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-5xl font-bold text-gradient-hero">10$</span>
                <span className="text-muted-foreground">/mois</span>
              </div>
              <ul className="mt-8 space-y-3 text-sm">
                {[
                  "Chef IA illimité",
                  "Tous les cours premium",
                  "Nouveaux cours chaque mois",
                  "Support prioritaire",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-primary" /> {item}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="mt-8 block">
                <Button className="w-full shadow-glow">Passer Premium</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t py-10 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Chef IA — La cuisine, élevée par l'IA.</p>
      </footer>
    </div>
  );
}
