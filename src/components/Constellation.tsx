"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
type GraphNote = { id: string; title: string; color: string; tags: string[] };

type Node = {
  id: string;
  kind: "note" | "tag";
  label: string;
  color?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  href?: string;
};
type Edge = { a: number; b: number };

/**
 * Graphe de force léger (canvas, sans dépendance) : les tags attirent les
 * notes qui les portent. Un premier pas vers une exploration non linéaire.
 */
export function Constellation({ notes }: { notes: GraphNote[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ── Construction du graphe ──
    const tagCount = new Map<string, number>();
    for (const n of notes) for (const t of n.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
    // Peu de notes : on montre tous les tags. Beaucoup : seulement ceux partagés.
    const minCount = tagCount.size <= 40 ? 1 : 2;
    const tags = [...tagCount.entries()].filter(([, c]) => c >= minCount).sort((a, b) => b[1] - a[1]).slice(0, 40);
    const tagIndex = new Map<string, number>();

    const W = () => canvas.clientWidth;
    const H = () => canvas.clientHeight;
    const rnd = (s: number) => (Math.random() - 0.5) * s;

    const nodes: Node[] = [];
    for (const [t, c] of tags) {
      tagIndex.set(t, nodes.length);
      nodes.push({ id: `tag:${t}`, kind: "tag", label: `#${t}`, x: W() / 2 + rnd(W() / 2), y: H() / 2 + rnd(H() / 2), vx: 0, vy: 0, r: 6 + Math.min(c, 8) });
    }
    const edges: Edge[] = [];
    for (const n of notes) {
      const linked = n.tags.filter((t) => tagIndex.has(t));
      if (linked.length === 0 && tags.length > 0) continue;
      const idx = nodes.length;
      nodes.push({ id: n.id, kind: "note", label: n.title, color: n.color, x: W() / 2 + rnd(W()), y: H() / 2 + rnd(H()), vx: 0, vy: 0, r: 5, href: `/notes/${n.id}` });
      for (const t of linked) edges.push({ a: idx, b: tagIndex.get(t)! });
    }

    // ── Rendu & simulation ──
    const css = getComputedStyle(document.documentElement);
    const color = (v: string) => css.getPropertyValue(v).trim();
    let raf = 0;
    let dragging: Node | null = null;
    let hover: Node | null = null;
    let alpha = 1;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = W() * dpr;
      canvas!.height = H() * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    function step() {
      const w = W();
      const h = H();
      // Répulsion
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]!;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]!;
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1) {
            dx = rnd(1);
            dy = rnd(1);
            d2 = 1;
          }
          const f = (900 * alpha) / d2;
          const d = Math.sqrt(d2);
          const fx = (dx / d) * f;
          const fy = (dy / d) * f;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }
      // Ressorts
      for (const e of edges) {
        const a = nodes[e.a]!;
        const b = nodes[e.b]!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const f = (d - 70) * 0.02 * alpha;
        a.vx += (dx / d) * f;
        a.vy += (dy / d) * f;
        b.vx -= (dx / d) * f;
        b.vy -= (dy / d) * f;
      }
      // Gravité vers le centre + intégration
      for (const n of nodes) {
        n.vx += (w / 2 - n.x) * 0.002 * alpha;
        n.vy += (h / 2 - n.y) * 0.002 * alpha;
        if (n === dragging) continue;
        n.vx *= 0.85;
        n.vy *= 0.85;
        n.x = Math.max(n.r, Math.min(w - n.r, n.x + n.vx));
        n.y = Math.max(n.r, Math.min(h - n.r, n.y + n.vy));
      }
      alpha = Math.max(0.05, alpha * 0.995);
    }

    function draw() {
      const w = W();
      const h = H();
      ctx!.clearRect(0, 0, w, h);
      ctx!.lineWidth = 1;
      ctx!.strokeStyle = color("--border");
      for (const e of edges) {
        const a = nodes[e.a]!;
        const b = nodes[e.b]!;
        ctx!.beginPath();
        ctx!.moveTo(a.x, a.y);
        ctx!.lineTo(b.x, b.y);
        ctx!.stroke();
      }
      for (const n of nodes) {
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.r + (n === hover ? 2 : 0), 0, Math.PI * 2);
        ctx!.fillStyle = n.kind === "tag" ? color("--ink") : (n.color ?? color("--cat-other"));
        ctx!.fill();
        if (n.kind === "tag" || n === hover) {
          ctx!.font = `${n.kind === "tag" ? 600 : 400} 11px ${css.getPropertyValue("--font-geist-sans") || "sans-serif"}`;
          ctx!.fillStyle = n.kind === "tag" ? color("--muted") : color("--ink");
          ctx!.textAlign = "center";
          ctx!.fillText(n.label.length > 36 ? `${n.label.slice(0, 35)}…` : n.label, n.x, n.y - n.r - 5);
        }
      }
    }

    function loop() {
      step();
      draw();
      raf = requestAnimationFrame(loop);
    }
    loop();

    function at(ev: PointerEvent): Node | null {
      const rect = canvas!.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      let best: Node | null = null;
      let bestD = 14;
      for (const n of nodes) {
        const d = Math.hypot(n.x - x, n.y - y);
        if (d < bestD + n.r) {
          bestD = d;
          best = n;
        }
      }
      return best;
    }
    let moved = false;
    const onDown = (ev: PointerEvent) => {
      dragging = at(ev);
      moved = false;
      if (dragging) canvas!.setPointerCapture(ev.pointerId);
    };
    const onMove = (ev: PointerEvent) => {
      const rect = canvas!.getBoundingClientRect();
      if (dragging) {
        dragging.x = ev.clientX - rect.left;
        dragging.y = ev.clientY - rect.top;
        dragging.vx = dragging.vy = 0;
        moved = true;
        alpha = Math.max(alpha, 0.4);
      } else {
        hover = at(ev);
        canvas!.style.cursor = hover ? "pointer" : "default";
      }
    };
    const onUp = (ev: PointerEvent) => {
      if (dragging && !moved && dragging.href) router.push(dragging.href);
      if (dragging && !moved && dragging.kind === "tag") router.push(`/?tag=${encodeURIComponent(dragging.label.slice(1))}`);
      dragging = null;
      canvas!.releasePointerCapture(ev.pointerId);
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
    };
  }, [notes, router]);

  return <canvas ref={canvasRef} className="w-full h-[420px] rounded-xl bg-surface-2 touch-none" />;
}
