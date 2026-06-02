import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { generateRecipeVideo, getRecipeVideo } from "@/lib/recipe-video.functions";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Film, Loader2, AlertCircle } from "lucide-react";

type Scene = {
  step: number;
  label: string;
  caption: string;
  image: string;
  duration_ms: number;
};

type VideoRow = {
  id: string;
  status: "pending" | "generating" | "ready" | "failed";
  scenes: Scene[];
  dish_name: string | null;
  error: string | null;
  updated_at: string;
};

export function RecipeVideoPlayer({ chatId }: { chatId: string }) {
  const fetchVideo = useServerFn(getRecipeVideo);
  const triggerGenerate = useServerFn(generateRecipeVideo);
  const triggeredRef = useRef(false);

  const q = useQuery({
    queryKey: ["recipe-video", chatId],
    queryFn: () => fetchVideo({ data: { chatId } }),
    refetchInterval: (query) => {
      const d = query.state.data as VideoRow | null | undefined;
      if (!d) return 2000;
      if (d.status === "ready" || d.status === "failed") return false;
      return 3000;
    },
  });

  // Auto-trigger generation once when no row exists yet
  useEffect(() => {
    if (triggeredRef.current) return;
    if (q.isLoading) return;
    if (q.data && (q.data as VideoRow).status) return;
    triggeredRef.current = true;
    triggerGenerate({ data: { chatId } }).catch(() => {
      triggeredRef.current = false;
    });
  }, [q.data, q.isLoading, chatId, triggerGenerate]);

  const row = q.data as VideoRow | null;

  if (!row || row.status === "pending" || row.status === "generating") {
    return (
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>Génération de la vidéo de recette en cours…</span>
      </div>
    );
  }

  if (row.status === "failed") {
    return (
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span>Vidéo indisponible : {row.error ?? "erreur inconnue"}</span>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={() => {
            triggeredRef.current = false;
            triggerGenerate({ data: { chatId } }).catch(() => {});
          }}
        >
          <RotateCcw className="mr-1 h-3 w-3" /> Réessayer
        </Button>
      </div>
    );
  }

  if (row.status === "ready" && row.scenes?.length) {
    return <ScenePlayer scenes={row.scenes} dish={row.dish_name} />;
  }

  return null;
}

function ScenePlayer({ scenes, dish }: { scenes: Scene[]; dish: string | null }) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [elapsed, setElapsed] = useState(0); // ms within current scene
  const tickRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  const current = scenes[idx];
  const total = useMemo(
    () => scenes.reduce((acc, s) => acc + s.duration_ms, 0),
    [scenes],
  );

  useEffect(() => {
    if (!playing) {
      if (tickRef.current) cancelAnimationFrame(tickRef.current);
      lastTsRef.current = null;
      return;
    }
    const loop = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;
      setElapsed((e) => {
        const next = e + dt;
        if (next >= current.duration_ms) {
          if (idx >= scenes.length - 1) {
            setPlaying(false);
            return current.duration_ms;
          }
          setIdx((i) => i + 1);
          return 0;
        }
        return next;
      });
      tickRef.current = requestAnimationFrame(loop);
    };
    tickRef.current = requestAnimationFrame(loop);
    return () => {
      if (tickRef.current) cancelAnimationFrame(tickRef.current);
    };
  }, [playing, current, idx, scenes.length]);

  const reset = () => {
    setIdx(0);
    setElapsed(0);
    setPlaying(true);
  };

  const progressGlobal =
    (scenes.slice(0, idx).reduce((a, s) => a + s.duration_ms, 0) + elapsed) /
    Math.max(1, total);

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border bg-black shadow-xl">
      <div className="flex items-center gap-2 border-b border-white/10 bg-black/60 px-4 py-2 text-xs text-white/80">
        <Film className="h-3.5 w-3.5 text-primary" />
        <span className="font-medium">
          {dish ? `Vidéo · ${dish}` : "Vidéo de recette"}
        </span>
        <span className="ml-auto tabular-nums">
          {idx + 1} / {scenes.length}
        </span>
      </div>

      <div className="relative aspect-video w-full overflow-hidden bg-neutral-900">
        {scenes.map((s, i) => {
          const active = i === idx;
          return (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-700 ease-out"
              style={{ opacity: active ? 1 : 0, pointerEvents: active ? "auto" : "none" }}
            >
              {s.image ? (
                <img
                  src={s.image}
                  alt={s.label}
                  className="h-full w-full object-cover"
                  style={{
                    transform: active ? "scale(1.12)" : "scale(1)",
                    transition: `transform ${s.duration_ms}ms linear`,
                    transformOrigin: i % 2 === 0 ? "center center" : "30% 70%",
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/40">
                  Image indisponible
                </div>
              )}
              {/* gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              {/* step chip */}
              <div
                className="absolute left-5 top-5 rounded-full bg-primary/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-foreground shadow-lg"
                style={{
                  opacity: active ? 1 : 0,
                  transform: active ? "translateY(0)" : "translateY(-8px)",
                  transition: "all 500ms ease-out 200ms",
                }}
              >
                Étape {s.step} · {s.label}
              </div>
              {/* caption */}
              <div
                className="absolute inset-x-0 bottom-0 px-6 pb-8 pt-12"
                style={{
                  opacity: active ? 1 : 0,
                  transform: active ? "translateY(0)" : "translateY(20px)",
                  transition: "all 600ms ease-out 300ms",
                }}
              >
                <p className="font-display text-xl font-semibold leading-tight text-white drop-shadow-lg sm:text-2xl">
                  {s.caption}
                </p>
              </div>
            </div>
          );
        })}

        {/* scene progress bar */}
        <div className="absolute inset-x-0 top-0 flex gap-1 p-2">
          {scenes.map((_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full bg-primary"
                style={{
                  width:
                    i < idx
                      ? "100%"
                      : i === idx
                        ? `${(elapsed / current.duration_ms) * 100}%`
                        : "0%",
                  transition: i === idx ? "width 100ms linear" : "none",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-white/10 bg-black/60 px-4 py-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-white hover:bg-white/10 hover:text-white"
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-white hover:bg-white/10 hover:text-white"
          onClick={reset}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        <div className="ml-2 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-1 bg-primary"
            style={{ width: `${Math.min(100, progressGlobal * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
