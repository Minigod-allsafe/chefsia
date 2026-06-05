import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  ChefHat,
  Sparkles,
  Check,
  Star,
  Clock,
  Award,
  ArrowRight,
  MessageSquare,
  CalendarDays,
  Video,
  TrendingUp,
  Brain,
  UtensilsCrossed,
  Shield,
  Zap,
  PlayCircle,
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
  { src: slide1, alt: "ChefIA — Un chef privé 24h/24" },
  { src: slide2, alt: "ChefIA — Inspiration culinaire illimitée" },
  { src: slide3, alt: "ChefIA travaille pour vous 24h/24" },
  { src: slide4, alt: "ChefIA — Recettes personnalisées" },
  { src: slide5, alt: "ChefIA — Apprenez avec les pros" },
  { src: slide6, alt: "ChefIA — Disponible partout" },
  { src: slide7, alt: "ChefIA — Démarrer gratuitement" },
];

const HERO_BENEFITS = [
  "Recettes personnalisées",
  "Assistance instantanée",
  "Plans de repas intelligents",
  "Techniques professionnelles",
  "Disponible 24h/24",
  "Débutant à expert",
];

const STEPS = [
  {
    n: "01",
    icon: MessageSquare,
    title: "Décrivez vos goûts",
    text: "Indiquez vos préférences, allergies, objectifs ou les ingrédients que vous avez sous la main.",
  },
  {
    n: "02",
    icon: Brain,
    title: "ChefIA crée votre expérience",
    text: "L'IA génère instantanément des recettes, des conseils et des plans de repas pensés pour vous.",
  },
  {
    n: "03",
    icon: UtensilsCrossed,
    title: "Cuisinez avec confiance",
    text: "Suivez les instructions pas à pas et progressez comme avec un véritable chef personnel.",
  },
];

const FEATURES = [
  { icon: UtensilsCrossed, title: "Recettes personnalisées", text: "Des idées adaptées à vos goûts, votre niveau et vos contraintes." },
  { icon: Brain, title: "Assistant culinaire intelligent", text: "Posez vos questions et recevez des réponses précises en quelques secondes." },
  { icon: CalendarDays, title: "Planificateur de repas", text: "Organisez votre semaine, vos courses et vos menus en quelques clics." },
  { icon: Video, title: "Formations vidéo premium", text: "Apprenez les techniques signées par des chefs professionnels." },
  { icon: Zap, title: "Disponible 24h/24", text: "Votre assistant cuisine ne dort jamais — il est là quand vous l'êtes." },
  { icon: TrendingUp, title: "Progression continue", text: "Suivez votre évolution et développez de nouvelles compétences chaque semaine." },
];

const TESTIMONIALS = [
  { quote: "Interface simple et intuitive — j'ai compris en 30 secondes.", name: "Camille R.", role: "Cheffe à domicile · Paris" },
  { quote: "Des conseils personnalisés comme si un vrai chef m'écoutait.", name: "Thomas L.", role: "Pâtissier amateur · Lyon" },
  { quote: "Un gain de temps énorme pour planifier la semaine.", name: "Sofia M.", role: "Foodie · Marseille" },
  { quote: "Inspiration culinaire illimitée, je ne tourne plus en rond.", name: "Antoine D.", role: "Passionné · Bordeaux" },
  { quote: "Disponible à tout moment, même à minuit avant l'apéro.", name: "Léa B.", role: "Étudiante · Nantes" },
  { quote: "Une vraie expérience premium, on sent la qualité.", name: "Yann P.", role: "Restaurateur · Lille" },
];

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="absolute top-0 z-30 w-full">
        <div className="container-app flex items-center justify-between py-5">
          <div className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight">
            <ChefHat className="h-6 w-6 text-primary" />
            <span>Chef <span className="text-gradient-gold">IA</span></span>
          </div>
          <nav className="flex items-center gap-2 sm:gap-4">
            <a href="#how" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">
              Comment ça marche
            </a>
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

      {/* ============ HERO ============ */}
      <section className="relative isolate overflow-hidden pt-32 pb-20 sm:pt-40">
        <img
          src={heroChef}
          alt="Chef cuisinant un plat raffiné"
          width={1536}
          height={1024}
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-30"
        />
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse at top, oklch(0.74 0.19 48 / 0.18), transparent 60%), linear-gradient(180deg, oklch(0.12 0.005 80 / 0.75) 0%, oklch(0.12 0.005 80 / 0.99) 100%)",
          }}
        />
        <IngredientsBackground count={22} className="-z-10" />

        <div className="container-app grid items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-20">
          {/* Left — copy */}
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-primary backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> IA Culinaire Premium
            </span>

            <h1 className="mt-6 font-display text-[2.7rem] leading-[1.05] sm:text-6xl lg:text-[4.2rem]">
              Votre <span className="italic text-gradient-gold">chef personnel</span> disponible 24h/24 grâce à l'intelligence artificielle.
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
              Obtenez instantanément des recettes personnalisées, des plans de repas intelligents,
              des conseils de chefs professionnels et un accompagnement adapté à votre niveau —
              en quelques secondes.
            </p>

            {/* Benefits checklist */}
            <ul className="mx-auto mt-7 grid max-w-xl grid-cols-1 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2 lg:mx-0">
              {HERO_BENEFITS.map((b) => (
                <li key={b} className="flex items-center gap-2 text-foreground/90">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/30">
                    <Check className="h-3 w-3 text-primary" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link to="/signup">
                <Button size="lg" className="group h-12 px-7 text-base shadow-glow">
                  Commencer gratuitement
                  <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-0.5" />
                </Button>
              </Link>
              <a href="#how">
                <Button size="lg" variant="outline" className="h-12 border-primary/30 px-7 text-base hover:bg-primary/5">
                  <PlayCircle className="mr-1 h-4 w-4" />
                  Voir une démonstration
                </Button>
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs uppercase tracking-[0.15em] text-muted-foreground lg:justify-start">
              <span className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 fill-primary text-primary" /> 4,9/5 · 2 400 chefs</span>
              <span className="hidden sm:inline">·</span>
              <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-primary" /> Sans engagement</span>
            </div>
          </div>

          {/* Right — product showcase */}
          <div className="relative mx-auto w-full max-w-xl">
            <div
              className="absolute -inset-6 -z-10 rounded-[2rem] opacity-60 blur-3xl"
              style={{ background: "radial-gradient(60% 60% at 50% 40%, oklch(0.74 0.19 48 / 0.45), transparent 70%)" }}
            />
            <div className="rounded-3xl border border-border/60 bg-card/70 p-3 shadow-premium backdrop-blur-xl">
              {/* Window chrome */}
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-accent/70" />
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">chefia.app</span>
                <span className="text-[10px] text-primary">● en ligne</span>
              </div>

              {/* Chat */}
              <div className="space-y-3 rounded-2xl bg-background/70 p-5 ring-1 ring-border/50">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <span className="text-xs">VO</span>
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-muted/60 px-4 py-2.5 text-sm">
                    J'ai du saumon, des asperges et 20 min. Tu me proposes quoi ?
                  </div>
                </div>
                <div className="flex items-start justify-end gap-3">
                  <div className="rounded-2xl rounded-tr-sm bg-gradient-to-br from-primary to-accent px-4 py-2.5 text-sm text-primary-foreground shadow-glow">
                    Saumon snacké, asperges glacées au beurre noisette, écume citronnée. Prêt en 18 min — je t'envoie la recette.
                  </div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary ring-1 ring-primary/40">
                    <ChefHat className="h-4 w-4" />
                  </div>
                </div>

                {/* Mini dashboard cards */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-border/50 bg-card/70 p-3">
                    <UtensilsCrossed className="h-4 w-4 text-primary" />
                    <div className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">Recette</div>
                    <div className="text-sm font-medium">Saumon 18′</div>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-card/70 p-3">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <div className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">Semaine</div>
                    <div className="text-sm font-medium">7 menus</div>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-card/70 p-3">
                    <Video className="h-4 w-4 text-primary" />
                    <div className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">Cours</div>
                    <div className="text-sm font-medium">+120 vidéos</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-primary/40 bg-background/90 px-4 py-2 text-xs shadow-glow backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Réponse moyenne : <strong className="text-primary">1,4 s</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* ============ COMMENT ÇA MARCHE ============ */}
      <section id="how" className="container-app relative py-24">
        <div className="text-center">
          <span className="text-xs uppercase tracking-[0.2em] text-primary">— En 3 étapes</span>
          <h2 className="mt-4 font-display text-4xl sm:text-5xl">Comment ça marche ?</h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            Démarrer prend moins d'une minute. Sans carte bancaire, sans engagement.
          </p>
        </div>

        <div className="relative mt-16 grid gap-6 md:grid-cols-3">
          {/* Decorative connecting line */}
          <div className="pointer-events-none absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent md:block" />
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="group relative rounded-2xl border border-border/60 bg-card/60 p-7 backdrop-blur-sm transition-all duration-500 hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow"
            >
              <div className="flex items-center gap-4">
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-glow">
                  <s.icon className="h-6 w-6" />
                </div>
                <span className="font-display text-3xl text-gradient-gold">{s.n}</span>
              </div>
              <h3 className="mt-6 text-xl font-medium">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ POURQUOI CHEFIA ============ */}
      <section id="features" className="border-y border-border/50 bg-card/30 py-28">
        <div className="container-app">
          <div className="text-center">
            <span className="text-xs uppercase tracking-[0.2em] text-primary">— L'expérience</span>
            <h2 className="mt-4 font-display text-5xl sm:text-6xl">
              Pourquoi choisir <span className="italic text-gradient-gold">ChefIA</span>
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
              Une plateforme premium, pensée comme un grand restaurant : chaque détail compte.
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
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
        </div>
      </section>

      {/* ============ STATS ============ */}
      <section className="border-b border-border/50">
        <div className="container-app grid grid-cols-2 gap-px bg-border/40 md:grid-cols-4">
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

      {/* ============ CARROUSEL (Storytelling visuel) ============ */}
      <section className="container-app py-24">
        <div className="text-center">
          <span className="text-xs uppercase tracking-[0.2em] text-primary">— L'histoire en images</span>
          <h2 className="mt-4 font-display text-4xl sm:text-5xl">
            Découvrez <span className="italic text-gradient-gold">ChefIA</span> en 7 slides
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
            Glissez horizontalement.
          </p>
        </div>

        <div
          data-testid="carousel"
          className="mt-12 -mx-6 overflow-x-auto px-6 pb-6 [scroll-snap-type:x_mandatory]"
        >
          <div className="flex gap-5">
            {CAROUSEL_SLIDES.map((s, i) => (
              <Link
                key={i}
                to="/signup"
                aria-label={s.alt}
                data-testid="carousel-slide"
                data-slide-index={i}
                className="group relative block shrink-0 cursor-pointer overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card-premium transition-all duration-500 hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [scroll-snap-align:center]"
                style={{ width: "min(82vw, 460px)" }}
              >
                <img
                  src={s.src}
                  alt={s.alt}
                  width={1080}
                  height={1080}
                  loading="lazy"
                  draggable={false}
                  className="pointer-events-none aspect-square w-full select-none object-cover"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-background/95 via-background/40 to-transparent px-5 py-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <span>{i + 1} / {CAROUSEL_SLIDES.length}</span>
                  <span className="text-primary">ChefIA</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PREUVE SOCIALE ============ */}
      <section className="border-y border-border/50 bg-card/30 py-24">
        <div className="container-app">
          <div className="text-center">
            <span className="text-xs uppercase tracking-[0.2em] text-primary">— Ils en parlent</span>
            <h2 className="mt-4 font-display text-4xl sm:text-5xl">
              Pourquoi les utilisateurs <span className="italic text-gradient-gold">adorent ChefIA</span>
            </h2>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
                <strong className="ml-1 text-foreground">4,9/5</strong> · 2 400+ avis
              </span>
              <span className="hidden sm:inline">·</span>
              <span className="flex items-center gap-1.5"><Award className="h-4 w-4 text-primary" /> Conçu avec des chefs étoilés</span>
              <span className="hidden sm:inline">·</span>
              <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-primary" /> Données sécurisées</span>
            </div>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure
                key={t.name}
                className="relative rounded-2xl border border-border/60 bg-background p-7 shadow-card-premium transition hover:-translate-y-1 hover:border-primary/40"
              >
                <div className="flex gap-1 text-primary">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <blockquote className="mt-4 font-display text-lg leading-snug">
                  « {t.quote} »
                </blockquote>
                <figcaption className="mt-5 border-t border-border/50 pt-4 text-sm">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-muted-foreground">{t.role}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="pricing" className="py-28">
        <div className="container-app">
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
                <Button variant="outline" className="w-full border-border/70">Créer mon compte</Button>
              </Link>
            </div>

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
                <Button variant="outline" className="w-full border-border/70">Contacter l'équipe</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CTA FINAL ============ */}
      <section className="relative overflow-hidden border-t border-border/60 py-28">
        <img
          src={heroChef}
          alt=""
          aria-hidden
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-20"
        />
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse at center, oklch(0.74 0.19 48 / 0.25), transparent 60%), linear-gradient(180deg, oklch(0.10 0.005 80 / 0.85), oklch(0.10 0.005 80 / 0.98))",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-primary backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> Démarrage immédiat
          </span>
          <h2 className="mt-6 font-display text-5xl sm:text-6xl">
            Prêt à <span className="italic text-gradient-gold">transformer</span> votre façon de cuisiner ?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            Rejoignez ChefIA et découvrez une nouvelle manière d'apprendre, de créer et de cuisiner
            grâce à l'intelligence artificielle.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/signup">
              <Button size="lg" className="h-12 px-8 text-base shadow-glow">
                Commencer gratuitement
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="h-12 border-primary/30 px-7 text-base hover:bg-primary/5">
                Découvrir les fonctionnalités
              </Button>
            </a>
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs uppercase tracking-[0.15em] text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> Sans carte bancaire</span>
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary" /> Prêt en 1 min</span>
            <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-primary" /> Annulez à tout moment</span>
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
