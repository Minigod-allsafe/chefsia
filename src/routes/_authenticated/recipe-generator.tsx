import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  generateRecipe,
  generateRecipeImage,
  generateRecipeSlideshow,
  type Recipe,
} from "@/lib/recipe-generator.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ChefHat, Sparkles, Clock, Gauge, Loader2, Play, Pause } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/recipe-generator")({
  component: RecipeGeneratorPage,
});

type Stage = "idle" | "recipe" | "image" | "video" | "done";
type Frame = { label: string; image: string };

const STAGE_LABEL: Record<Exclude<Stage, "idle" | "done">, string> = {
  recipe: "Génération de la recette…",
  image: "Création de l'image…",
  video: "Préparation de la vidéo…",
};

function RecipeGeneratorPage() {
  const askRecipe = useServerFn(generateRecipe);
  const askImage = useServerFn(generateRecipeImage);
  const askSlideshow = useServerFn(generateRecipeSlideshow);

  const [prompt, setPrompt] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [frames, setFrames] = useState<Frame[]>([]);

  const generate = async () => {
    const q = prompt.trim();
    if (!q || stage !== "idle" && stage !== "done") return;
    setRecipe(null);
    setImageUrl(null);
    setFrames([]);

    try {
      setStage("recipe");
      const { recipe: r } = await askRecipe({ data: { prompt: q } });
      setRecipe(r);

      setStage("image");
      const { image_url } = await askImage({ data: { image_prompt: r.image_prompt } });
      setImageUrl(image_url);

      setStage("video");
      try {
        const { frames: fr } = await askSlideshow({
          data: { video_prompt: r.video_prompt, steps: r.steps.slice(0, 3) },
        });
        setFrames(fr);
      } catch (err) {
        // Slideshow fallback is best-effort
        console.warn("slideshow failed", err);
      }

      setStage("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      toast.error(msg);
      setStage("idle");
    }
  };

  const busy = stage !== "idle" && stage !== "done";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary">
          <ChefHat className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-semibold">Générateur de recettes</h1>
          <p className="text-sm text-muted-foreground">
            Décrivez ce que vous voulez cuisiner — l'IA imagine la recette, l'image et la vidéo.
          </p>
        </div>
      </div>

      <Card className="border-border/60 bg-card/60 p-4 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            value={prompt}
            placeholder="ex : pizza maison fine et croustillante"
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") generate();
            }}
            disabled={busy}
            maxLength={500}
            className="h-12 flex-1"
          />
          <Button
            onClick={generate}
            disabled={busy || !prompt.trim()}
            size="lg"
            className="h-12 gap-2"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {busy ? "ChefIA cuisine…" : "Générer la recette"}
          </Button>
        </div>
      </Card>

      {busy && <ProgressSteps stage={stage} />}

      {recipe && (
        <article className="mt-8 space-y-8">
          <header className="space-y-3">
            <h2 className="font-display text-4xl font-semibold leading-tight">
              {recipe.title}
            </h2>
            <p className="text-muted-foreground">{recipe.description}</p>
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1">
                <Clock className="h-3.5 w-3.5" /> {recipe.cooking_time}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1">
                <Gauge className="h-3.5 w-3.5" /> {recipe.difficulty}
              </span>
            </div>
          </header>

          <ImageBlock url={imageUrl} loading={stage === "image"} />

          <div className="grid gap-8 md:grid-cols-[1fr_1.4fr]">
            <section>
              <h3 className="mb-3 font-display text-xl font-semibold">Ingrédients</h3>
              <ul className="space-y-2 text-sm">
                {recipe.ingredients.map((ing, i) => (
                  <li
                    key={i}
                    className="flex gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-2"
                  >
                    <span className="text-primary">•</span>
                    <span>{ing}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="mb-3 font-display text-xl font-semibold">Étapes</h3>
              <ol className="space-y-3">
                {recipe.steps.map((step, i) => (
                  <li
                    key={i}
                    className="flex gap-3 rounded-lg border border-border/60 bg-card/40 px-4 py-3"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {i + 1}
                    </span>
                    <p className="text-sm leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <VideoBlock frames={frames} loading={stage === "video"} />
        </article>
      )}
    </div>
  );
}

function ProgressSteps({ stage }: { stage: Stage }) {
  const order: Array<Exclude<Stage, "idle" | "done">> = ["recipe", "image", "video"];
  const currentIndex = order.indexOf(stage as any);
  return (
    <div className="mt-6 space-y-2">
      {order.map((s, i) => {
        const active = i === currentIndex;
        const done = i < currentIndex;
        return (
          <div
            key={s}
            className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
              active
                ? "border-primary/40 bg-primary/5 text-foreground"
                : done
                  ? "border-border/60 bg-card/40 text-muted-foreground"
                  : "border-border/40 text-muted-foreground/60"
            }`}
          >
            {active ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : done ? (
              <span className="grid h-4 w-4 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground">
                ✓
              </span>
            ) : (
              <span className="h-4 w-4 rounded-full border border-border" />
            )}
            <span>{STAGE_LABEL[s]}</span>
          </div>
        );
      })}
    </div>
  );
}

function ImageBlock({ url, loading }: { url: string | null; loading: boolean }) {
  if (!url && !loading) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-black shadow-2xl">
      {url ? (
        <img src={url} alt="Plat généré" className="aspect-square w-full object-cover sm:aspect-[16/10]" />
      ) : (
        <div className="grid aspect-[16/10] w-full place-items-center text-sm text-white/60">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Création de l'image…
          </div>
        </div>
      )}
    </div>
  );
}

function VideoBlock({ frames, loading }: { frames: Frame[]; loading: boolean }) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    setIdx(0);
  }, [frames]);

  useEffect(() => {
    if (!playing || frames.length === 0) return;
    timer.current = window.setTimeout(() => {
      setIdx((i) => (i + 1) % frames.length);
    }, 2200);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [idx, playing, frames]);

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Préparation de la vidéo…
      </div>
    );
  }
  if (frames.length === 0) return null;
  const current = frames[idx];
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-black shadow-2xl">
      <div className="relative aspect-video w-full">
        {frames.map((f, i) => (
          <img
            key={i}
            src={f.image}
            alt={f.label}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
            style={{ opacity: i === idx ? 1 : 0 }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute left-4 top-4 rounded-full bg-primary/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground">
          {current.label}
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 p-3">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <div className="flex flex-1 gap-1">
            {frames.map((_, i) => (
              <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: i < idx ? "100%" : i === idx ? "60%" : "0%" }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
