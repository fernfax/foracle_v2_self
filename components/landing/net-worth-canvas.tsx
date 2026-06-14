"use client";

import { useEffect, useRef } from "react";
import { type MotionValue } from "motion/react";

/**
 * Generative net-worth line-art for the scroll-pinned LifeStages. Draws a
 * Catmull-Rom curve through each milestone's holdings (log-scaled — the range
 * spans S$8K → S$1.45M) on a 2D canvas. The curve "grows" left→right with
 * scroll `progress` and the active milestone's node pulses. 2D (not WebGL —
 * the mesh-gradient owns the WebGL context); dpr-crisp, paused offscreen, and
 * drawn once in its final state under reduced-motion.
 */
export function NetWorthCanvas({
  values,
  colors,
  progress,
  reduced = false,
}: {
  values: number[];
  colors: string[];
  progress: MotionValue<number>;
  reduced?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pRef = useRef(0);

  // Mirror the MotionValue into a ref the rAF loop can read without re-rendering.
  useEffect(() => {
    pRef.current = progress.get();
    const unsub = progress.on("change", (v) => {
      pRef.current = v;
    });
    return () => unsub();
  }, [progress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;
    let W = 0;
    let H = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = wrap.getBoundingClientRect();
      W = r.width;
      H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const N = values.length;
    const logs = values.map((v) => Math.log10(Math.max(1, v)));
    const minL = Math.min(...logs);
    const maxL = Math.max(...logs);
    const PADX = 0.07;
    const PADTOP = 0.18;
    const PADBOT = 0.14;

    const points = () =>
      logs.map((l, i) => {
        const x = (PADX + (1 - 2 * PADX) * (i / (N - 1))) * W;
        const yn = (l - minL) / (maxL - minL || 1);
        const y = (1 - PADBOT) * H - yn * (1 - PADTOP - PADBOT) * H;
        return { x, y };
      });

    type Pt = { x: number; y: number };
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const lp = (A: Pt, B: Pt, t: number): Pt => ({ x: lerp(A.x, B.x, t), y: lerp(A.y, B.y, t) });
    const hexRgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const mix = (h1: string, h2: string, t: number): [number, number, number] => {
      const a = hexRgb(h1);
      const b = hexRgb(h2);
      return [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)), Math.round(lerp(a[2], b[2], t))];
    };

    // Catmull-Rom control points for the segment P[i] → P[i+1].
    const seg = (P: Pt[], i: number) => {
      const p0 = P[i - 1] || P[i];
      const p1 = P[i];
      const p2 = P[i + 1];
      const p3 = P[i + 2] || P[i + 1];
      return {
        p1,
        p2,
        c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
        c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
      };
    };

    const fullPath = (P: Pt[]) => {
      const path = new Path2D();
      if (!P.length) return path;
      path.moveTo(P[0].x, P[0].y);
      for (let i = 0; i < P.length - 1; i++) {
        const s = seg(P, i);
        path.bezierCurveTo(s.c1.x, s.c1.y, s.c2.x, s.c2.y, s.p2.x, s.p2.y);
      }
      return path;
    };

    // Curve grown to a CONTINUOUS progress p∈[0,1]. Returns the stroke path, the
    // live point gliding ON the curve, and the colour interpolated between the
    // two milestones it sits between — so the node moves seamlessly with scroll
    // and the area ends exactly at it (no rectangular clip seam).
    const grown = (P: Pt[], p: number) => {
      const M = P.length - 1;
      const pos = Math.max(0, Math.min(M, p * M));
      const si = Math.min(M - 1, Math.floor(pos));
      const t = pos - si;
      const path = new Path2D();
      path.moveTo(P[0].x, P[0].y);
      for (let i = 0; i < si; i++) {
        const s = seg(P, i);
        path.bezierCurveTo(s.c1.x, s.c1.y, s.c2.x, s.c2.y, s.p2.x, s.p2.y);
      }
      const s = seg(P, si);
      // De Casteljau split of the active segment at t → sub-curve P1→F.
      const A = lp(s.p1, s.c1, t);
      const B = lp(s.c1, s.c2, t);
      const C = lp(s.c2, s.p2, t);
      const D = lp(A, B, t);
      const E = lp(B, C, t);
      const F = lp(D, E, t);
      path.bezierCurveTo(A.x, A.y, D.x, D.y, F.x, F.y);
      const color = mix(colors[si] || "#B8622A", colors[si + 1] || colors[si] || "#B8622A", t);
      return { path, dot: F, color };
    };

    // Burst bookkeeping: timestamp the glider last crossed each milestone.
    const burstAt: number[] = new Array(values.length).fill(-Infinity);
    let prevP = -1;
    const BURST_MS = 750;

    const draw = (now = 0) => {
      const dark = document.documentElement.classList.contains("dark");
      const faint = dark ? "rgba(240,235,224,0.16)" : "rgba(28,43,42,0.12)";
      const upcoming = dark ? "rgba(240,235,224,0.34)" : "rgba(28,43,42,0.28)";
      const ringStroke = dark ? "rgba(20,30,29,0.95)" : "rgba(255,255,255,0.95)";
      const p = reduced ? 1 : Math.max(0, Math.min(1, pRef.current));
      const P = points();
      const M = P.length - 1;

      const g = grown(P, p);

      // Detect milestone crossings (either scroll direction) → start a burst.
      if (prevP >= 0) {
        for (let i = 0; i < P.length; i++) {
          const mp = i / M;
          if ((prevP < mp && p >= mp) || (prevP > mp && p <= mp)) burstAt[i] = now;
        }
      }
      prevP = p;

      ctx.clearRect(0, 0, W, H);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      // Area fill under the grown curve — drawn first so its right edge can be
      // feathered (below) without erasing the lines/dots layered on top.
      const area = new Path2D(g.path);
      area.lineTo(g.dot.x, H);
      area.lineTo(P[0].x, H);
      area.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "rgba(184,98,42,0.20)");
      grad.addColorStop(1, "rgba(184,98,42,0)");
      ctx.fillStyle = grad;
      ctx.fill(area);

      // Feather the fill's right edge so it tapers into the live point (no hard
      // vertical seam) — erase a horizontal gradient over the last ~64px.
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      const fade = ctx.createLinearGradient(g.dot.x - 64, 0, g.dot.x + 6, 0);
      fade.addColorStop(0, "rgba(0,0,0,0)");
      fade.addColorStop(1, "rgba(0,0,0,1)");
      ctx.fillStyle = fade;
      ctx.fillRect(g.dot.x - 64, 0, 80, H);
      ctx.restore();

      // Faint full track.
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = faint;
      ctx.stroke(fullPath(P));

      // Grown line, ending exactly at the live point.
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#B8622A";
      ctx.stroke(g.path);

      // Milestone nodes (enlarged) + a glow/burst as the glider passes each one.
      for (let i = 0; i < P.length; i++) {
        const pt = P[i];
        const passed = p >= i / M - 1e-4;
        const [mr, mg, mb] = hexRgb(colors[i] || "#B8622A");

        // Pass burst: soft glow + expanding ring, ~750ms ease-out.
        const age = now - burstAt[i];
        if (age >= 0 && age < BURST_MS) {
          const t = age / BURST_MS;
          const ease = 1 - Math.pow(1 - t, 3);
          ctx.beginPath();
          ctx.fillStyle = `rgba(${mr},${mg},${mb},${0.24 * (1 - t)})`;
          ctx.arc(pt.x, pt.y, 5 + ease * 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.lineWidth = 2.5 * (1 - t) + 0.5;
          ctx.strokeStyle = `rgba(${mr},${mg},${mb},${0.6 * (1 - t)})`;
          ctx.arc(pt.x, pt.y, 5 + ease * 26, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Base node — lights up in its milestone colour once passed, faint while ahead.
        ctx.beginPath();
        ctx.fillStyle = passed ? `rgb(${mr},${mg},${mb})` : upcoming;
        ctx.arc(pt.x, pt.y, passed ? 5 : 4, 0, Math.PI * 2);
        ctx.fill();
        if (passed) {
          ctx.lineWidth = 2;
          ctx.strokeStyle = ringStroke;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Live point gliding along the curve (on top of the nodes).
      const [cr, cg, cb] = g.color;
      ctx.beginPath();
      ctx.fillStyle = `rgba(${cr},${cg},${cb},0.18)`;
      ctx.arc(g.dot.x, g.dot.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.arc(g.dot.x, g.dot.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = ringStroke;
      ctx.beginPath();
      ctx.arc(g.dot.x, g.dot.y, 6, 0, Math.PI * 2);
      ctx.stroke();

      if (running && !reduced) raf = requestAnimationFrame(draw);
    };

    if (reduced) {
      draw();
      return () => ro.disconnect();
    }

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !running) {
          running = true;
          raf = requestAnimationFrame(draw);
        } else if (!e.isIntersecting && running) {
          running = false;
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0 }
    );
    io.observe(wrap);
    raf = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, [values, colors, reduced]);

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      <canvas ref={canvasRef} className="h-full w-full" aria-hidden />
    </div>
  );
}
