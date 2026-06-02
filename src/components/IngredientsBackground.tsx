import { useEffect, useMemo, useRef } from "react";

const INGREDIENTS = [
  "🍅", "🥑", "🌶️", "🧄", "🧅", "🥕", "🌽", "🥦", "🥬", "🫑",
  "🍋", "🍊", "🍓", "🍇", "🫐", "🍑", "🥝", "🍍", "🥥", "🍒",
  "🧀", "🥖", "🥐", "🥚", "🍯", "🌿", "🫒", "🍄", "🧈", "🥜",
];

type Particle = {
  el: HTMLSpanElement;
  baseX: number; // % of viewport
  baseY: number;
  size: number;
  depth: number; // 0..1 - parallax strength
  driftX: number;
  driftY: number;
  driftSpeed: number;
  driftPhase: number;
  rotSpeed: number; // deg/sec
  rot: number;
};

export function IngredientsBackground({
  count = 26,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const rafRef = useRef<number | null>(null);

  const items = useMemo(() => {
    const arr: string[] = [];
    for (let i = 0; i < count; i++) {
      arr.push(INGREDIENTS[i % INGREDIENTS.length]);
    }
    return arr;
  }, [count]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const spans = Array.from(
      container.querySelectorAll<HTMLSpanElement>("[data-ingredient]"),
    );

    const particles: Particle[] = spans.map((el) => {
      const depth = parseFloat(el.dataset.depth ?? "0.5");
      return {
        el,
        baseX: parseFloat(el.dataset.x ?? "50"),
        baseY: parseFloat(el.dataset.y ?? "50"),
        size: parseFloat(el.dataset.size ?? "32"),
        depth,
        driftX: 14 + Math.random() * 22, // px amplitude — plus calme
        driftY: 14 + Math.random() * 22,
        driftSpeed: 0.00006 + Math.random() * 0.00008,
        driftPhase: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 6, // -3..3 deg/sec — rotation plus douce
        rot: Math.random() * 360,
      };
    });

    const onMove = (e: MouseEvent) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // -1..1 around the center
      mouseRef.current.tx = (e.clientX / w - 0.5) * 2;
      mouseRef.current.ty = (e.clientY / h - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;

      // Smooth (lerp) the mouse target for parallax inertia
      mouseRef.current.x += (mouseRef.current.tx - mouseRef.current.x) * 0.06;
      mouseRef.current.y += (mouseRef.current.ty - mouseRef.current.y) * 0.06;

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (const p of particles) {
        const t = now * p.driftSpeed + p.driftPhase;
        const dx = Math.cos(t) * p.driftX;
        const dy = Math.sin(t * 1.3) * p.driftY;

        // Parallax: deeper layers move more with mouse
        const px = mx * p.depth * 60;
        const py = my * p.depth * 60;

        if (!reduceMotion) {
          p.rot += (p.rotSpeed * dt) / 1000;
        }

        p.el.style.transform = `translate3d(${dx + px}px, ${dy + py}px, 0) rotate(${p.rot}deg)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [items.length]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {items.map((emoji, i) => {
        // Deterministic-ish layout: jittered grid across the area
        const cols = 6;
        const rows = Math.ceil(items.length / cols);
        const cx = ((i % cols) + 0.5) / cols;
        const cy = (Math.floor(i / cols) + 0.5) / rows;
        const jitterX = (Math.sin(i * 12.9898) * 43758.5453) % 1;
        const jitterY = (Math.cos(i * 78.233) * 43758.5453) % 1;
        const x = Math.min(0.96, Math.max(0.04, cx + jitterX * 0.12));
        const y = Math.min(0.96, Math.max(0.04, cy + jitterY * 0.12));
        const depth = 0.3 + ((i * 37) % 100) / 250; // 0.30..0.70 — plage resserrée
        const size = 18 + ((i * 53) % 100) * 0.22; // 18..40px — plus discret
        // Flou progressif selon la profondeur (plus c'est lointain, plus c'est flou)
        const blur = depth < 0.4 ? 2.2 : depth < 0.55 ? 1.2 : 0.4;
        // Opacité douce et cohérente: 0.10 (loin) → 0.22 (proche)
        const opacity = 0.1 + (depth - 0.3) * 0.3;

        return (
          <span
            key={i}
            data-ingredient
            data-x={x * 100}
            data-y={y * 100}
            data-depth={depth}
            data-size={size}
            className="absolute select-none will-change-transform"
            style={{
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              fontSize: `clamp(${Math.round(size * 0.6)}px, ${(size / 16).toFixed(2)}vw + ${Math.round(size * 0.4)}px, ${Math.round(size)}px)`,
              opacity,
              filter: `blur(${blur}px)`,
              textShadow: "0 4px 18px rgba(0,0,0,0.25)",
            }}
          >
            {emoji}
          </span>
        );
      })}
    </div>
  );
}
