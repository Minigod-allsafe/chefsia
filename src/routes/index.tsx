import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  ChefHat,
  Sparkles,
  GraduationCap,
  Check,
  Star,
  Utensils,
  Clock,
  Award,
  ArrowRight,
} from "lucide-react";
import heroChef from "@/assets/hero-chef.jpg";
import { IngredientsBackground } from "@/components/IngredientsBackground";
import slide1 from "@/assets/carousel/slide-1.png";
import slide2 from "@/assets/carousel/slide-2.png";
import slide3 from "@/assets/carousel/slide-3.png";
import slide4 from "@/assets/carousel/slide-4.png";
import slide5 from "@/assets/carousel/slide-5.png";
import slide6 from "@/assets/carousel/slide-6.png";
import slide7 from "@/assets/carousel/slide-7.png";

const CAROUSEL_SLIDES = [
  { src: slide1, alt: "ChefIA — Votre entreprise perd-elle des clients ?" },
  { src: slide2, alt: "ChefIA — 80% des prospects ne reviennent jamais" },
  { src: slide3, alt: "ChefIA travaille pour vous 24h/24" },
  { src: slide4, alt: "ChefIA — Transformez vos visiteurs en clients" },
  { src: slide5, alt: "ChefIA — Les entreprises qui automatisent gagnent plus" },
  { src: slide6, alt: "ChefIA — Commencez aujourd'hui" },
  { src: slide7, alt: "ChefIA — Essayez gratuitement" },
];

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="absolute top-0 z-20 w-full">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight">
            <ChefHat className="h-6 w-6 text-primary" />
            <span>Chef <span className="text-gradient-gold">IA</span></span>
          </div>
          <nav className="flex items-center gap-2 sm:gap-4">
            <a href="#features" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">
              Fonctionnalités
            </a>
            <Link to="/pricing" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">
              Tarifs
            </Link>
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Connexion
            </Link>
            <Link to="/signup">
              <Button size="sm" className="shadow-glow">Commencer</Button>
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
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-40"
        />
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse at top, oklch(0.82 0.13 85 / 0.15), transparent 60%), linear-gradient(180deg, oklch(0.12 0.005 80 / 0.7) 0%, oklch(0.12 0.005 80 / 0.98) 100%)",
          }}
        />
        <IngredientsBackground count={28} className="-z-10" />

        <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 pt-24 text-center">
          <span className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-primary backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> Édition Premium 2026
          </span>

          <h1 className="font-display text-5xl leading-[1.02] sm:text-7xl md:text-8xl">
            <span className="italic text-gradient-gold">L'art</span> de la cuisine,
            <br />
            <span className="text-foreground">réinventé par l'IA.</span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Un chef privé disponible 24/7, des cours vidéo signés par les plus grands,
            une expérience pensée pour celles et ceux qui veulent <em className="text-foreground/90">vraiment</em> cuisiner.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/signup">
              <Button size="lg" className="group h-12 px-7 text-base shadow-glow">
                Démarrer gratuitement
                <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="outline" className="h-12 border-primary/30 px-7 text-base hover:bg-primary/5">
                Voir les tarifs
              </Button>
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs uppercase tracking-[0.15em] text-muted-foreground">
            <span className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 fill-primary text-primary" /> 4,9/5 · 2 400 chefs</span>
            <span className="hidden sm:inline">·</span>
            <span className="flex items-center gap-1.5"><Award className="h-3.5 w-3.5 text-primary" /> Conçu avec des chefs étoilés</span>
            <span className="hidden sm:inline">·</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Sans engagement</span>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-background" />
      </section>

      {/* Carrousel marketing */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center">
          <span className="text-xs uppercase tracking-[0.2em] text-primary">— En 7 slides</span>
          <h2 className="mt-4 font-display text-4xl sm:text-5xl">
            Pourquoi <span className="italic text-gradient-gold">ChefIA</span> change la donne
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
            Glissez horizontalement pour découvrir l'histoire.
          </p>
        </div>

        <div className="mt-12 -mx-6 overflow-x-auto px-6 pb-6 [scrollbar-color:var(--color-primary)_transparent] [scroll-snap-type:x_mandatory]">
          <div className="flex gap-5">
            {CAROUSEL_SLIDES.map((s, i) => (
              <figure
                key={i}
                className="group relative shrink-0 overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card-premium transition-all duration-500 hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow [scroll-snap-align:center]"
                style={{ width: "min(82vw, 460px)" }}
              >
                <img
                  src={s.src}
                  alt={s.alt}
                  width={1080}
                  height={1080}
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
                <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-background/95 via-background/40 to-transparent px-5 py-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <span>{i + 1} / {CAROUSEL_SLIDES.length}</span>
                  <span className="text-primary">ChefIA</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <Link to="/signup">
            <Button size="lg" className="h-12 px-8 shadow-glow">
              Essayer gratuitement
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Stats / social proof */}
      <section className="border-y border-border/50 bg-card/40">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-border/40 px-0 md:grid-cols-4">
          {[
            { value: "2 400+", label: "Chefs actifs" },
            { value: "120k", label: "Recettes générées" },
            { value: "4,9/5", label: "Note moyenne" },
            { value: "24/7", label: "Chef IA disponible" },
          ].map((s) => (
            <div key={s.label} className="bg-background px-6 py-10 text-center">
              <div className="font-display text-4xl text-gradient-gold">{s.value}</div>
              <div className="mt-2 text-xs uppercase tracking-[0.15em] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-28">
        <div className="text-center">
          <span className="text-xs uppercase tracking-[0.2em] text-primary">— L'expérience</span>
          <h2 className="mt-4 font-display text-5xl sm:text-6xl">
            Tout pour <span className="italic text-gradient-gold">cuisiner comme un pro</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Une plateforme premium, pensée comme un grand restaurant : chaque détail compte.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Sparkles,
              title: "Chef IA conversationnel",
              text: "Posez n'importe quelle question culinaire, recevez des recettes détaillées, des temps de cuisson précis et des accords mets-vins.",
            },
            {
              icon: GraduationCap,
              title: "Masterclasses vidéo",
              text: "Sauces mères, pâtisserie de palace, cuissons précises. Filmé en 4K, expliqué simplement, accessible à vie.",
            },
            {
              icon: Utensils,
              title: "Carnet de recettes vivant",
              text: "Sauvegardez, adaptez, partagez. Vos favoris suivent vos restrictions, vos goûts, vos saisons.",
            },
            {
              icon: Clock,
              title: "Planificateur intelligent",
              text: "Menus de la semaine, listes de courses optimisées, suggestions selon ce que vous avez déjà au frigo.",
            },
            {
              icon: Award,
              title: "Progression personnelle",
              text: "Suivez votre évolution, débloquez des techniques avancées, devenez le chef que vous rêvez d'être.",
            },
            {
              icon: ChefHat,
              title: "Concierge culinaire",
              text: "Un événement à organiser ? Notre IA conçoit votre menu, gère les quantités, propose une mise en place complète.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-8 shadow-card-premium transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20 transition group-hover:scale-110 group-hover:bg-primary/15">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-6 text-xl font-medium">{f.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-border/50 bg-card/30 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <span className="text-xs uppercase tracking-[0.2em] text-primary">— Ils en parlent</span>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl">
              Une communauté de <span className="italic text-gradient-gold">passionnés</span>
            </h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                quote: "Je ne pensais pas qu'une IA pouvait remplacer mon livre de recettes. Chef IA l'a fait, et bien au-delà.",
                name: "Camille R.",
                role: "Cheffe à domicile · Paris",
              },
              {
                quote: "Les Masterclasses sont d'une qualité bluffante. C'est ce que j'attendais depuis des années.",
                name: "Thomas L.",
                role: "Pâtissier amateur · Lyon",
              },
              {
                quote: "Un outil indispensable pour mes brunchs. Mes invités pensent que j'ai engagé un chef privé.",
                name: "Sofia M.",
                role: "Foodie · Marseille",
              },
            ].map((t) => (
              <figure
                key={t.name}
                className="relative rounded-2xl border border-border/60 bg-background p-8 shadow-card-premium"
              >
                <div className="flex gap-1 text-primary">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <blockquote className="mt-5 font-display text-xl leading-snug">
                  « {t.quote} »
                </blockquote>
                <figcaption className="mt-6 border-t border-border/50 pt-4 text-sm">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-muted-foreground">{t.role}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 py-28">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <span className="text-xs uppercase tracking-[0.2em] text-primary">— Tarification</span>
            <h2 className="mt-4 font-display text-5xl sm:text-6xl">
              Choisissez votre <span className="italic text-gradient-gold">menu</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
              Commencez gratuitement. Évoluez quand vous êtes prêt. Annulez à tout moment.
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {/* Free */}
            <div className="flex flex-col rounded-2xl border border-border/60 bg-card p-8 shadow-card-premium">
              <h3 className="font-display text-2xl">Découverte</h3>
              <p className="mt-1 text-sm text-muted-foreground">Pour goûter</p>
              <div className="mt-8 flex items-baseline gap-1">
                <span className="font-display text-6xl">0€</span>
                <span className="text-muted-foreground">/mois</span>
              </div>
              <ul className="mt-8 space-y-3 text-sm">
                {["3 requêtes Chef IA / jour", "Accès aux cours gratuits", "Carnet de recettes"].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {item}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="mt-auto block pt-8">
                <Button variant="outline" className="w-full border-border/70">
                  Créer mon compte
                </Button>
              </Link>
            </div>

            {/* Premium */}
            <div className="relative flex flex-col rounded-2xl border-2 border-primary/60 bg-gradient-to-b from-card to-card/40 p-8 shadow-premium md:-translate-y-3">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-gold px-4 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground shadow-glow">
                Le plus populaire
              </span>
              <h3 className="font-display text-2xl">Premium</h3>
              <p className="mt-1 text-sm text-muted-foreground">Pour les vrais passionnés</p>
              <div className="mt-8 flex items-baseline gap-1">
                <span className="font-display text-6xl text-gradient-gold">9,99€</span>
                <span className="text-muted-foreground">/mois</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">ou 99€/an · 2 mois offerts</p>
              <ul className="mt-8 space-y-3 text-sm">
                {[
                  "Chef IA illimité",
                  "Toutes les Masterclasses premium",
                  "Nouveaux cours chaque mois",
                  "Planificateur de menus",
                  "Support prioritaire",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {item}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="mt-auto block pt-8">
                <Button className="w-full shadow-glow">Passer Premium</Button>
              </Link>
            </div>

            {/* Business */}
            <div className="flex flex-col rounded-2xl border border-border/60 bg-card p-8 shadow-card-premium">
              <h3 className="font-display text-2xl">Business</h3>
              <p className="mt-1 text-sm text-muted-foreground">Pour les professionnels</p>
              <div className="mt-8 flex items-baseline gap-1">
                <span className="font-display text-6xl">29,99€</span>
                <span className="text-muted-foreground">/mois</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">ou 299€/an · 2 mois offerts</p>
              <ul className="mt-8 space-y-3 text-sm">
                {[
                  "Tout Premium inclus",
                  "Comptes équipe (5 utilisateurs)",
                  "Création de menus pro",
                  "Calcul de coûts & marges",
                  "Support dédié",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {item}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="mt-auto block pt-8">
                <Button variant="outline" className="w-full border-border/70">
                  Contacter l'équipe
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden border-t border-border/60 px-6 py-24">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background via-card/40 to-background" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-5xl sm:text-6xl">
            Prêt à <span className="italic text-gradient-gold">cuisiner autrement</span> ?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            Rejoignez les 2 400 chefs qui ont déjà élevé leur cuisine grâce à Chef IA.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/signup">
              <Button size="lg" className="h-12 px-8 text-base shadow-glow">
                Démarrer maintenant
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="ghost" className="h-12 px-6 text-base">
                Voir les tarifs détaillés
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2 font-display text-lg">
            <ChefHat className="h-5 w-5 text-primary" />
            Chef <span className="text-gradient-gold">IA</span>
          </div>
          <p>© {new Date().getFullYear()} Chef IA — La cuisine, élevée par l'IA.</p>
        </div>
      </footer>
    </div>
  );
}
