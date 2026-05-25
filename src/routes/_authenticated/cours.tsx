import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCoursesWithProgress, setProgress } from "@/lib/courses.functions";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Lock, Play, Clock, Crown } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/cours")({
  component: CoursesPage,
});

function CoursesPage() {
  const fetchCourses = useServerFn(listCoursesWithProgress);
  const updateProgress = useServerFn(setProgress);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["courses-progress"],
    queryFn: () => fetchCourses(),
  });
  const mut = useMutation({
    mutationFn: (v: { courseId: string; progress: number }) => updateProgress({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["courses-progress"] }),
  });

  const [playing, setPlaying] = useState<string | null>(null);

  if (isLoading) return <div className="p-10 text-muted-foreground">Chargement…</div>;
  const isPremium = data?.isPremium ?? false;
  const courses = data?.courses ?? [];

  const playingCourse = courses.find((c) => c.id === playing);

  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10">
      <header className="mb-8">
        <h1 className="font-display text-4xl font-bold">Cours</h1>
        <p className="mt-1 text-muted-foreground">
          Apprenez avec les meilleures techniques. Style Masterclass.
        </p>
      </header>

      {playingCourse && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPlaying(null)}
        >
          <div
            className="w-full max-w-4xl space-y-4 rounded-2xl bg-card p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={playingCourse.video_url ?? ""}
              controls
              autoPlay
              className="aspect-video w-full rounded-lg bg-black"
              onEnded={() => mut.mutate({ courseId: playingCourse.id, progress: 100 })}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                const pct = Math.min(100, Math.round((v.currentTime / (v.duration || 1)) * 100));
                if (pct > (playingCourse.progress_pct ?? 0) + 10) {
                  mut.mutate({ courseId: playingCourse.id, progress: pct });
                }
              }}
            />
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl font-semibold">{playingCourse.title}</h3>
                <p className="text-sm text-muted-foreground">{playingCourse.description}</p>
              </div>
              <Button variant="outline" onClick={() => setPlaying(null)}>Fermer</Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => {
          const locked = c.is_premium && !isPremium;
          return (
            <div
              key={c.id}
              className="group overflow-hidden rounded-2xl border bg-card shadow-card-premium transition hover:-translate-y-1 hover:shadow-glow"
            >
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={c.thumbnail_url ?? ""}
                  alt={c.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                {locked ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60">
                    <Lock className="h-8 w-8 text-primary" />
                    <span className="text-xs font-medium text-primary">Premium</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setPlaying(c.id)}
                    aria-label={`Lire ${c.title}`}
                    className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow">
                      <Play className="ml-0.5 h-6 w-6 fill-current" />
                    </span>
                  </button>
                )}
                {c.is_premium && (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-primary/90 px-2 py-1 text-[10px] font-bold text-primary-foreground">
                    <Crown className="h-3 w-3" /> PREMIUM
                  </span>
                )}
              </div>
              <div className="p-5">
                <h3 className="font-display text-lg font-semibold">{c.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> {c.duration_min} min
                </div>
                <div className="mt-3">
                  <Progress value={c.progress_pct} className="h-1.5" />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {c.progress_pct}% complété
                  </p>
                </div>
                {locked && (
                  <Link to="/premium">
                    <Button className="mt-4 w-full" size="sm">Débloquer Premium</Button>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
