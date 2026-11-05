import { clsx } from "clsx";
import type { ReactNode } from "react";

import { SUBJECT_STYLE, subjectOf } from "@/lib/design/subject";

/*
 * A small drawing for each course, made from Derive's own code: vectors for
 * linear algebra, a tangent for calculus, an attention matrix for the
 * Transformer, a ring of devices for distributed training. Decorative only;
 * the course's code and title always stand beside it.
 */

const W = 240;
const H = 120;

/** A small seeded random generator, so a course's drawing never changes between renders. */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f1 = (n: number) => Math.round(n * 10) / 10;

function curve(f: (x: number) => number, x0: number, x1: number, step = 4): string {
  const pts: string[] = [];
  for (let x = x0; x <= x1 + 0.001; x += step) pts.push(`${f1(x)} ${f1(f(x))}`);
  return `M${pts.join("L")}`;
}

function Arrow({ x1, y1, x2, y2, o = 1, w = 2.25 }: { x1: number; y1: number; x2: number; y2: number; o?: number; w?: number }) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const s = 7;
  const p1 = `${f1(x2 - s * Math.cos(a - 0.45))},${f1(y2 - s * Math.sin(a - 0.45))}`;
  const p2 = `${f1(x2 - s * Math.cos(a + 0.45))},${f1(y2 - s * Math.sin(a + 0.45))}`;
  return (
    <g opacity={o}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={w} strokeLinecap="round" />
      <polygon points={`${x2},${y2} ${p1} ${p2}`} fill="currentColor" />
    </g>
  );
}

function motif(code: string): ReactNode {
  const r = seeded(code);
  const gauss = () => (r() + r() + r() - 1.5) / 1.5;
  switch (code) {
    case "M1": {
      // A number line and a function rising across it.
      const ticks = Array.from({ length: 11 }, (_, i) => 20 + i * 20);
      return (
        <>
          <line x1={14} y1={92} x2={226} y2={92} stroke="currentColor" strokeWidth={1.5} opacity={0.55} />
          {ticks.map((x, i) => (
            <line key={x} x1={x} y1={i % 5 === 0 ? 84 : 88} x2={x} y2={96} stroke="currentColor" strokeWidth={1.5} opacity={0.55} />
          ))}
          <path d={curve((x) => 92 - 62 / (1 + Math.exp(-(x - 120) / 22)), 16, 224)} fill="none" stroke="currentColor" strokeWidth={2.5} />
          {[60, 120, 180].map((x) => (
            <circle key={x} cx={x} cy={f1(92 - 62 / (1 + Math.exp(-(x - 120) / 22)))} r={4} fill="currentColor" />
          ))}
        </>
      );
    }
    case "M2": {
      // Two vectors, their sum and the parallelogram they span.
      return (
        <>
          <path d="M80 96 L150 70 L190 26 L120 52 Z" fill="currentColor" opacity={0.12} />
          <path d="M150 70 L190 26 M120 52 L190 26" stroke="currentColor" strokeDasharray="4 4" strokeWidth={1.5} opacity={0.5} />
          <Arrow x1={80} y1={96} x2={150} y2={70} />
          <Arrow x1={80} y1={96} x2={120} y2={52} />
          <Arrow x1={80} y1={96} x2={190} y2={26} o={0.55} w={2} />
          <circle cx={80} cy={96} r={4} fill="currentColor" />
        </>
      );
    }
    case "M3": {
      // Area under a curve as strips, and a tangent touching it.
      const f = (x: number) => 100 - 70 * (1 - Math.exp(-(x - 16) / 70));
      const strips = Array.from({ length: 8 }, (_, i) => 30 + i * 12);
      const x0 = 172;
      const slope = (f(x0 + 0.5) - f(x0 - 0.5)) / 1;
      return (
        <>
          {strips.map((x) => (
            <rect key={x} x={x} y={f1(f(x + 6))} width={11} height={f1(104 - f(x + 6))} fill="currentColor" opacity={0.16} />
          ))}
          <line x1={14} y1={104} x2={226} y2={104} stroke="currentColor" strokeWidth={1.5} opacity={0.45} />
          <path d={curve(f, 16, 224)} fill="none" stroke="currentColor" strokeWidth={2.5} />
          <line x1={x0 - 50} y1={f1(f(x0) - 50 * slope)} x2={x0 + 46} y2={f1(f(x0) + 46 * slope)} stroke="currentColor" strokeWidth={2} opacity={0.6} />
          <circle cx={x0} cy={f1(f(x0))} r={4.5} fill="currentColor" />
        </>
      );
    }
    case "M4": {
      // A histogram of outcomes under the bell curve it tends to.
      const bars = Array.from({ length: 13 }, (_, i) => i);
      const g = (x: number) => Math.exp(-((x - 120) ** 2) / (2 * 30 ** 2));
      return (
        <>
          {bars.map((i) => {
            const x = 48 + i * 11.5;
            const h = 78 * g(x + 5) * (0.85 + 0.3 * r());
            return <rect key={i} x={f1(x)} y={f1(104 - h)} width={9.5} height={f1(h)} rx={1.5} fill="currentColor" opacity={0.22} />;
          })}
          <line x1={14} y1={104} x2={226} y2={104} stroke="currentColor" strokeWidth={1.5} opacity={0.45} />
          <path d={curve((x) => 104 - 80 * g(x), 20, 220, 3)} fill="none" stroke="currentColor" strokeWidth={2.5} />
        </>
      );
    }
    case "M5": {
      // Partial sums of a series closing in on their limit, inside a narrowing band.
      const sums: number[] = [];
      let s = 0;
      for (let k = 0; k < 12; k++) {
        s += (k % 2 === 0 ? 1 : -1) / (k + 1);
        sums.push(s);
      }
      const y = (v: number) => 104 - 82 * v;
      const x = (k: number) => 24 + k * 17.5;
      const limit = y(Math.log(2));
      const band = (t: number) => 60 / ((t - 24) / 17.5 + 1.6);
      const upper: string[] = [];
      const lower: string[] = [];
      for (let t = 24; t <= 220; t += 4) {
        upper.push(`${t} ${f1(limit - band(t))}`);
        lower.unshift(`${t} ${f1(limit + band(t))}`);
      }
      return (
        <>
          <path d={`M${upper.join("L")}L${lower.join("L")}Z`} fill="currentColor" opacity={0.1} />
          <line x1={14} y1={f1(limit)} x2={226} y2={f1(limit)} stroke="currentColor" strokeWidth={1.75} strokeDasharray="6 5" opacity={0.7} />
          <polyline points={sums.map((v, k) => `${f1(x(k))},${f1(y(v))}`).join(" ")} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" opacity={0.55} />
          {sums.map((v, k) => (
            <circle key={k} cx={f1(x(k))} cy={f1(y(v))} r={k === 0 ? 4.5 : 3.5} fill="currentColor" />
          ))}
        </>
      );
    }
    case "M6": {
      // Level sets of a surface and the gradient across them.
      return (
        <>
          {[14, 28, 42, 56, 70].map((k, i) => (
            <ellipse key={k} cx={140} cy={60} rx={k * 1.5} ry={k * 0.72} fill="none" stroke="currentColor" strokeWidth={1.75} opacity={0.75 - i * 0.12} transform="rotate(-18 140 60)" />
          ))}
          <Arrow x1={140 + 64} y1={60 - 30} x2={140 + 30} y2={60 - 12} />
          <circle cx={140} cy={60} r={3.5} fill="currentColor" />
        </>
      );
    }
    case "M7": {
      // A circle and the ellipse a matrix turns it into, with their axes.
      return (
        <>
          <circle cx={66} cy={60} r={32} fill="currentColor" opacity={0.1} stroke="currentColor" strokeWidth={2} />
          <Arrow x1={66} y1={60} x2={98} y2={60} w={2} />
          <Arrow x1={66} y1={60} x2={66} y2={28} w={2} />
          <path d="M112 60 L136 60" stroke="currentColor" strokeWidth={2} strokeDasharray="3 4" opacity={0.6} />
          <g transform="rotate(-22 182 60)">
            <ellipse cx={182} cy={60} rx={50} ry={18} fill="currentColor" opacity={0.1} stroke="currentColor" strokeWidth={2} />
            <Arrow x1={182} y1={60} x2={232} y2={60} w={2} />
            <Arrow x1={182} y1={60} x2={182} y2={42} w={2} />
          </g>
        </>
      );
    }
    case "M8": {
      // In high dimensions, random points crowd onto a thin shell.
      const pts = Array.from({ length: 70 }, () => {
        const a = r() * Math.PI * 2;
        const rad = 40 + gauss() * 4;
        return { x: 120 + rad * Math.cos(a) * 1.35, y: 60 + rad * Math.sin(a) };
      });
      return (
        <>
          <ellipse cx={120} cy={60} rx={54} ry={40} fill="none" stroke="currentColor" strokeWidth={1.5} opacity={0.35} />
          <ellipse cx={120} cy={60} rx={20} ry={15} fill="currentColor" opacity={0.08} />
          {pts.map((p, i) => (
            <circle key={i} cx={f1(p.x)} cy={f1(p.y)} r={2.5} fill="currentColor" opacity={0.65} />
          ))}
        </>
      );
    }
    case "M9": {
      // Noisy points, the line fitted through them and its uncertainty.
      const pts = Array.from({ length: 26 }, (_, i) => {
        const x = 24 + i * 7.6 + r() * 4;
        return { x, y: 96 - (x - 20) * 0.33 + gauss() * 12 };
      });
      return (
        <>
          <path d="M18 92 L222 22 L222 44 L18 108 Z" fill="currentColor" opacity={0.1} />
          <line x1={18} y1={100} x2={222} y2={33} stroke="currentColor" strokeWidth={2.5} />
          {pts.map((p, i) => (
            <circle key={i} cx={f1(p.x)} cy={f1(p.y)} r={3.25} fill="currentColor" opacity={0.55} />
          ))}
        </>
      );
    }
    case "M10": {
      // Gradient descent zigzagging down a long valley.
      const path = [
        [28, 22],
        [70, 92],
        [96, 34],
        [124, 80],
        [140, 46],
        [156, 70],
        [164, 56],
        [170, 61],
      ];
      return (
        <>
          {[16, 34, 52, 70, 88].map((k, i) => (
            <ellipse key={k} cx={170} cy={60} rx={k * 1.9} ry={k * 0.62} fill="none" stroke="currentColor" strokeWidth={1.5} opacity={0.6 - i * 0.1} />
          ))}
          <polyline points={path.map((p) => p.join(",")).join(" ")} fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinejoin="round" />
          {path.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i === path.length - 1 ? 5 : 3.25} fill="currentColor" />
          ))}
        </>
      );
    }
    case "M11": {
      // A code tree: each branch is one bit.
      const nodes: { x: number; y: number; d: number }[] = [];
      const edges: [number, number, number, number][] = [];
      const grow = (x: number, y: number, d: number, span: number) => {
        nodes.push({ x, y, d });
        if (d === 3) return;
        for (const s of [-1, 1]) {
          const nx = x + 48;
          const ny = y + (s * span) / 2;
          edges.push([x, y, nx, ny]);
          grow(nx, ny, d + 1, span / 2);
        }
      };
      grow(52, 60, 0, 88);
      return (
        <>
          {edges.map(([a, b, c, d], i) => (
            <line key={i} x1={a} y1={b} x2={c} y2={d} stroke="currentColor" strokeWidth={1.75} opacity={0.5} />
          ))}
          {nodes.map((n, i) =>
            n.d === 3 ? (
              <rect key={i} x={n.x - 5} y={n.y - 5} width={10} height={10} rx={2} fill="currentColor" opacity={0.35 + 0.5 * r()} />
            ) : (
              <circle key={i} cx={n.x} cy={n.y} r={4.5} fill="currentColor" />
            ),
          )}
        </>
      );
    }
    case "M12": {
      // A Kronecker product: each entry of one matrix scales a whole copy of the other.
      const a = [
        [1, 0.35, 0.7],
        [0.35, 0.85, 0.2],
        [0.7, 0.2, 0.55],
      ];
      const b = [
        [0.9, 0.2, 0.5],
        [0.2, 1, 0.3],
        [0.5, 0.3, 0.8],
      ];
      const small = (ox: number, m: number[][]) =>
        m.flatMap((row, i) =>
          row.map((v, j) => <rect key={`${ox}-${i}-${j}`} x={ox + j * 10} y={45 + i * 10} width={8.5} height={8.5} rx={1.5} fill="currentColor" opacity={0.1 + 0.8 * v} />),
        );
      const s = 11;
      return (
        <>
          {small(16, a)}
          <circle cx={62} cy={60} r={7} fill="none" stroke="currentColor" strokeWidth={1.75} />
          <path d="M57 55 L67 65 M67 55 L57 65" stroke="currentColor" strokeWidth={1.75} />
          {small(76, b)}
          <Arrow x1={110} y1={60} x2={124} y2={60} w={1.75} />
          {Array.from({ length: 9 }, (_, i) =>
            Array.from({ length: 9 }, (_, j) => (
              <rect
                key={`k${i}-${j}`}
                x={130 + j * s}
                y={11 + i * s}
                width={s - 1.5}
                height={s - 1.5}
                rx={1.5}
                fill="currentColor"
                opacity={f1(0.06 + 0.88 * a[Math.floor(i / 3)]![Math.floor(j / 3)]! * b[i % 3]![j % 3]!)}
              />
            )),
          )}
        </>
      );
    }
    case "M13": {
      // Floating-point numbers: evenly spaced within each power of two, sparser further out.
      const xs: { x: number; major: boolean }[] = [];
      for (let e = -3; e <= 2; e++) {
        for (let m = 0; m < 8; m++) {
          const v = 2 ** e * (1 + m / 8);
          if (v <= 7.5) xs.push({ x: 20 + v * 27, major: m === 0 });
        }
      }
      return (
        <>
          <line x1={14} y1={70} x2={226} y2={70} stroke="currentColor" strokeWidth={1.5} opacity={0.55} />
          {xs.map((t, i) => (
            <line key={i} x1={f1(t.x)} y1={t.major ? 44 : 58} x2={f1(t.x)} y2={t.major ? 96 : 82} stroke="currentColor" strokeWidth={t.major ? 2.25 : 1.5} opacity={t.major ? 1 : 0.6} />
          ))}
          <circle cx={20} cy={70} r={4} fill="currentColor" />
        </>
      );
    }
    case "M14": {
      // A noisy training loss falling while the learning rate warms up, then decays.
      const lr = (x: number) => (x < 52 ? (x - 18) / 34 : 0.1 + 0.45 * (1 + Math.cos((Math.PI * (x - 52)) / 170)));
      const loss = (x: number) => 72 - 50 * Math.exp(-(x - 18) / 46);
      const noisy: string[] = [];
      for (let x = 18; x <= 222; x += 3) noisy.push(`${x},${f1(loss(x) + gauss() * 9 * (0.35 + 0.65 * lr(x)))}`);
      return (
        <>
          <path d={`${curve((x) => 106 - 20 * lr(x), 18, 222, 2)}L222 106L18 106Z`} fill="currentColor" opacity={0.14} />
          <line x1={14} y1={106} x2={226} y2={106} stroke="currentColor" strokeWidth={1.5} opacity={0.45} />
          <polyline points={noisy.join(" ")} fill="none" stroke="currentColor" strokeWidth={1.5} opacity={0.5} strokeLinejoin="round" />
          <path d={curve(loss, 18, 222, 3)} fill="none" stroke="currentColor" strokeWidth={2.5} />
        </>
      );
    }
    case "M15": {
      // Random walks spreading out from one start.
      const walks = [0.95, 0.6, 0.4, 0.25].map((o) => {
        let y = 60;
        const pts = [`16,60`];
        for (let x = 22; x <= 224; x += 6) {
          y += gauss() * 7;
          y = Math.max(14, Math.min(106, y));
          pts.push(`${x},${f1(y)}`);
        }
        return { o, pts: pts.join(" ") };
      });
      return (
        <>
          {walks.map((w, i) => (
            <polyline key={i} points={w.pts} fill="none" stroke="currentColor" strokeWidth={i === 0 ? 2.5 : 1.75} opacity={w.o} strokeLinejoin="round" />
          ))}
          <circle cx={16} cy={60} r={4.5} fill="currentColor" />
        </>
      );
    }
    case "L1": {
      // Two classes and the boundary a model learns between them.
      const a = Array.from({ length: 16 }, () => ({ x: 70 + gauss() * 34, y: 40 + gauss() * 22 }));
      const b = Array.from({ length: 16 }, () => ({ x: 168 + gauss() * 34, y: 82 + gauss() * 22 }));
      return (
        <>
          <path d="M60 116 L196 4" stroke="currentColor" strokeWidth={2.5} strokeDasharray="7 5" />
          <path d="M0 0 L196 4 L60 116 L0 120 Z" fill="currentColor" opacity={0.06} />
          {a.map((p, i) => (
            <circle key={`a${i}`} cx={f1(p.x)} cy={f1(p.y)} r={4} fill="currentColor" opacity={0.85} />
          ))}
          {b.map((p, i) => (
            <circle key={`b${i}`} cx={f1(p.x)} cy={f1(p.y)} r={3.5} fill="none" stroke="currentColor" strokeWidth={1.75} />
          ))}
        </>
      );
    }
    case "L2": {
      // A decision tree's axis-aligned regions, each voting for one class.
      const regions = [
        { x: 14, y: 8, w: 96, h: 48, a: true },
        { x: 14, y: 56, w: 96, h: 56, a: false },
        { x: 110, y: 8, w: 116, h: 68, a: false },
        { x: 110, y: 76, w: 60, h: 36, a: true },
        { x: 170, y: 76, w: 56, h: 36, a: false },
      ];
      return (
        <>
          {regions.map((g, i) => (
            <rect key={`r${i}`} x={g.x} y={g.y} width={g.w} height={g.h} fill="currentColor" opacity={g.a ? 0.16 : 0.04} />
          ))}
          <path d="M110 8 V112 M14 56 H110 M110 76 H226 M170 76 V112" fill="none" stroke="currentColor" strokeWidth={2.25} />
          {regions.flatMap((g, i) =>
            Array.from({ length: Math.round((g.w * g.h) / 1100) + 2 }, (_, k) => {
              const cx = f1(g.x + 8 + r() * (g.w - 16));
              const cy = f1(g.y + 8 + r() * (g.h - 16));
              return g.a ? (
                <circle key={`p${i}-${k}`} cx={cx} cy={cy} r={3.5} fill="currentColor" opacity={0.85} />
              ) : (
                <circle key={`p${i}-${k}`} cx={cx} cy={cy} r={3.25} fill="none" stroke="currentColor" strokeWidth={1.75} />
              );
            }),
          )}
        </>
      );
    }
    case "L3": {
      // A small network: three layers of units and the weights between them.
      const layers = [3, 5, 4, 2].map((n, li) =>
        Array.from({ length: n }, (_, i) => ({ x: 40 + li * 54, y: 60 + (i - (n - 1) / 2) * 22 })),
      );
      return (
        <>
          {layers.slice(0, -1).flatMap((layer, li) =>
            layer.flatMap((p, i) =>
              layers[li + 1]!.map((q, j) => (
                <line key={`${li}-${i}-${j}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="currentColor" strokeWidth={1.25} opacity={0.15 + 0.45 * r()} />
              )),
            ),
          )}
          {layers.flat().map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={6.5} fill="currentColor" />
          ))}
        </>
      );
    }
    case "L4": {
      // A causal attention pattern: each token looks only at the ones before it.
      const n = 8;
      const s = 11;
      const ox = 120;
      const oy = 16;
      return (
        <>
          {Array.from({ length: n }, (_, i) => (
            <rect key={`t${i}`} x={20 + (i % 4) * 22} y={30 + Math.floor(i / 4) * 34} width={16} height={16} rx={3} fill="currentColor" opacity={0.3 + (i / n) * 0.6} />
          ))}
          {Array.from({ length: n }, (_, i) =>
            Array.from({ length: n }, (_, j) =>
              j <= i ? (
                <rect key={`${i}-${j}`} x={ox + j * s} y={oy + i * s} width={s - 2} height={s - 2} rx={1.5} fill="currentColor" opacity={j === i ? 0.95 : 0.12 + 0.6 * r()} />
              ) : (
                <rect key={`${i}-${j}`} x={ox + j * s} y={oy + i * s} width={s - 2} height={s - 2} rx={1.5} fill="none" stroke="currentColor" strokeWidth={0.75} opacity={0.2} />
              ),
            ),
          )}
        </>
      );
    }
    case "L5": {
      // A learnt space where similar things land together.
      const centres = [
        { x: 66, y: 44 },
        { x: 152, y: 34 },
        { x: 118, y: 88 },
      ];
      return (
        <>
          {centres.map((c, k) => (
            <g key={k}>
              <ellipse cx={c.x} cy={c.y} rx={30} ry={20} fill="currentColor" opacity={0.08} />
              {Array.from({ length: 11 }, (_, i) => (
                <circle key={i} cx={f1(c.x + gauss() * 17)} cy={f1(c.y + gauss() * 11)} r={k === 0 ? 3.5 : 3} fill={k === 1 ? "none" : "currentColor"} stroke="currentColor" strokeWidth={1.5} opacity={k === 2 ? 0.5 : 0.85} />
              ))}
            </g>
          ))}
          <path d="M196 96 C 210 80, 214 60, 202 44" fill="none" stroke="currentColor" strokeWidth={1.75} strokeDasharray="3 4" opacity={0.6} />
        </>
      );
    }
    case "L6": {
      // Loss falling as a straight line on log axes, for models of growing size.
      return (
        <>
          <line x1={24} y1={104} x2={224} y2={104} stroke="currentColor" strokeWidth={1.5} opacity={0.45} />
          <line x1={24} y1={104} x2={24} y2={12} stroke="currentColor" strokeWidth={1.5} opacity={0.45} />
          {[0, 1, 2, 3].map((k) => (
            <path
              key={k}
              d={curve((x) => 24 + k * 12 + 70 * Math.exp(-(x - 30) / (40 + k * 30)) + k * 2, 30 + k * 34, 222, 4)}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              opacity={0.3 + k * 0.15}
            />
          ))}
          <line x1={34} y1={22} x2={222} y2={92} stroke="currentColor" strokeWidth={2.5} strokeDasharray="6 5" />
        </>
      );
    }
    case "L7": {
      // A grid world, and the path an agent learns to the goal.
      const cols = 8;
      const rows = 4;
      const s = 22;
      const ox = 32;
      const oy = 16;
      const path = [
        [0, 3],
        [1, 3],
        [2, 3],
        [2, 2],
        [3, 2],
        [4, 2],
        [4, 1],
        [5, 1],
        [6, 1],
        [7, 1],
        [7, 0],
      ];
      return (
        <>
          {Array.from({ length: rows }, (_, y) =>
            Array.from({ length: cols }, (_, x) => (
              <rect key={`${x}-${y}`} x={ox + x * s} y={oy + y * s} width={s - 3} height={s - 3} rx={3} fill="currentColor" opacity={(x === 3 && y === 3) || (x === 5 && y === 3) || (x === 1 && y === 1) ? 0.4 : 0.08} />
            )),
          )}
          <polyline points={path.map(([x, y]) => `${ox + x! * s + 9.5},${oy + y! * s + 9.5}`).join(" ")} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinejoin="round" />
          <circle cx={ox + 9.5} cy={oy + 3 * s + 9.5} r={5} fill="currentColor" />
          <path d={`M${ox + 7 * s + 6} ${oy + 18} V${oy + 2} l9 4 -9 4`} fill="currentColor" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
        </>
      );
    }
    case "L8": {
      // A broad starting distribution and the sharper one post-training moves it to.
      const g = (mu: number, sd: number, h: number) => (x: number) => 104 - h * Math.exp(-((x - mu) ** 2) / (2 * sd * sd));
      return (
        <>
          <path d={`${curve(g(96, 34, 46), 14, 226, 3)}L226 104L14 104Z`} fill="currentColor" opacity={0.12} />
          <path d={curve(g(96, 34, 46), 14, 226, 3)} fill="none" stroke="currentColor" strokeWidth={1.75} opacity={0.5} />
          <path d={curve(g(156, 15, 82), 14, 226, 2)} fill="none" stroke="currentColor" strokeWidth={2.5} />
          <Arrow x1={104} y1={46} x2={140} y2={30} w={2} o={0.8} />
          <line x1={14} y1={104} x2={226} y2={104} stroke="currentColor" strokeWidth={1.5} opacity={0.45} />
        </>
      );
    }
    case "L9": {
      // Activations of many units, with one feature picked out.
      const cols = 16;
      const rows = 6;
      return (
        <>
          {Array.from({ length: rows }, (_, y) =>
            Array.from({ length: cols }, (_, x) => (
              <rect key={`${x}-${y}`} x={24 + x * 12} y={20 + y * 13} width={10} height={11} rx={2} fill="currentColor" opacity={x === 10 ? 0.35 + 0.6 * r() : 0.06 + 0.3 * r() * r()} />
            )),
          )}
          <rect x={141} y={15} width={14} height={86} rx={4} fill="none" stroke="currentColor" strokeWidth={2.25} />
          <circle cx={188} cy={58} r={16} fill="none" stroke="currentColor" strokeWidth={2.25} opacity={0.7} />
          <line x1={200} y1={70} x2={214} y2={84} stroke="currentColor" strokeWidth={3} strokeLinecap="round" opacity={0.7} />
        </>
      );
    }
    case "E1": {
      // A short program: indented lines and a cursor.
      const lines = [
        [0, 70],
        [1, 104],
        [2, 84],
        [2, 120],
        [1, 52],
        [0, 0],
        [0, 92],
      ];
      return (
        <>
          {lines.map(([indent, len], i) => (
            <g key={i}>
              <rect x={22} y={16 + i * 13} width={8} height={6} rx={2} fill="currentColor" opacity={0.3} />
              {len ? <rect x={44 + indent! * 16} y={15 + i * 13} width={len} height={8} rx={4} fill="currentColor" opacity={i === 3 ? 0.9 : 0.25 + 0.4 * r()} /> : null}
            </g>
          ))}
          <rect x={44 + 92 + 4} y={12 + 6 * 13} width={2.5} height={14} fill="currentColor" />
        </>
      );
    }
    case "E2": {
      // Your own plots: a line, its points and a bar chart beside it.
      const f = (x: number) => 82 - 26 * Math.sin((x - 20) / 22) - (x - 20) * 0.08;
      return (
        <>
          <line x1={18} y1={104} x2={150} y2={104} stroke="currentColor" strokeWidth={1.5} opacity={0.45} />
          <line x1={18} y1={104} x2={18} y2={14} stroke="currentColor" strokeWidth={1.5} opacity={0.45} />
          <path d={curve(f, 20, 148, 3)} fill="none" stroke="currentColor" strokeWidth={2.5} />
          {[34, 58, 82, 106, 130].map((x) => (
            <circle key={x} cx={x} cy={f1(f(x) + gauss() * 6)} r={3.25} fill="currentColor" opacity={0.55} />
          ))}
          {[44, 72, 58, 90].map((h, i) => (
            <rect key={i} x={166 + i * 15} y={104 - h} width={11} height={h} rx={2} fill="currentColor" opacity={0.25 + i * 0.18} />
          ))}
        </>
      );
    }
    case "E3": {
      // A main line of commits, a branch, and the merge back.
      return (
        <>
          <line x1={18} y1={74} x2={222} y2={74} stroke="currentColor" strokeWidth={2.5} />
          <path d="M70 74 C 90 74, 90 38, 112 38 L 156 38 C 178 38, 178 74, 196 74" fill="none" stroke="currentColor" strokeWidth={2.25} opacity={0.6} />
          {[30, 70, 120, 160, 196, 214].map((x) => (
            <circle key={x} cx={x} cy={74} r={6} fill="currentColor" />
          ))}
          {[112, 134, 156].map((x) => (
            <circle key={x} cx={x} cy={38} r={5.5} fill="none" stroke="currentColor" strokeWidth={2} />
          ))}
        </>
      );
    }
    case "E4": {
      // A processor and the memory beneath it: each level larger and slower than the one above.
      const widths = [24, 52, 80, 108, 136];
      const pins = [30, 40, 50];
      return (
        <>
          {pins.map((p) => (
            <g key={p} stroke="currentColor" strokeWidth={2} opacity={0.7}>
              <line x1={p} y1={33} x2={p} y2={40} />
              <line x1={p} y1={76} x2={p} y2={83} />
              <line x1={15} y1={p + 18} x2={22} y2={p + 18} />
              <line x1={58} y1={p + 18} x2={65} y2={p + 18} />
            </g>
          ))}
          <rect x={22} y={40} width={36} height={36} rx={5} fill="currentColor" />
          <path d="M67 58 C 100 58, 104 23, 134 23" fill="none" stroke="currentColor" strokeWidth={1.75} strokeDasharray="4 4" opacity={0.6} />
          {widths.map((w, i) => (
            <rect key={w} x={150 - w / 2} y={16 + i * 19} width={w} height={14} rx={3} fill="currentColor" opacity={0.85 - i * 0.15} />
          ))}
        </>
      );
    }
    case "E5": {
      // A computation graph: values flow forwards, gradients flow back.
      const nodes = [
        { x: 30, y: 34 },
        { x: 30, y: 86 },
        { x: 96, y: 60 },
        { x: 156, y: 60 },
        { x: 210, y: 60 },
      ];
      return (
        <>
          {[
            [0, 2],
            [1, 2],
            [2, 3],
            [3, 4],
          ].map(([a, b]) => (
            <Arrow key={`${a}${b}`} x1={nodes[a!]!.x + 16} y1={nodes[a!]!.y} x2={nodes[b!]!.x - 18} y2={nodes[b!]!.y} w={2} />
          ))}
          <path d="M196 78 C 160 104, 110 104, 82 80" fill="none" stroke="currentColor" strokeWidth={1.75} strokeDasharray="4 4" opacity={0.6} />
          {nodes.map((n, i) => (
            <rect key={i} x={n.x - 15} y={n.y - 11} width={30} height={22} rx={6} fill="currentColor" opacity={i === 4 ? 1 : 0.3 + i * 0.12} />
          ))}
        </>
      );
    }
    case "E6": {
      // Tiled matrix multiplication: a row block of A and a column block of B make one tile of C.
      const s = 9;
      const grid = (ox: number, oy: number, cols: number, rows: number, hi: (x: number, y: number) => boolean) =>
        Array.from({ length: rows }, (_, y) =>
          Array.from({ length: cols }, (_, x) => (
            <rect key={`${ox}-${x}-${y}`} x={ox + x * s} y={oy + y * s} width={s - 1.5} height={s - 1.5} rx={1.5} fill="currentColor" opacity={hi(x, y) ? 0.85 : 0.12} />
          )),
        );
      return (
        <>
          {grid(150, 6, 6, 3, (x) => x === 2 || x === 3)}
          {grid(78, 42, 6, 6, (_x, y) => y === 1 || y === 2)}
          {grid(150, 42, 6, 6, (x, y) => (x === 2 || x === 3) && (y === 1 || y === 2))}
          <rect x={150 + 2 * s - 2} y={42 + s - 2} width={2 * s + 2.5} height={2 * s + 2.5} rx={3} fill="none" stroke="currentColor" strokeWidth={2} />
        </>
      );
    }
    case "E7": {
      // Devices in a ring, each passing a slice to the next.
      const n = 6;
      const pts = Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        return { x: 120 + 70 * Math.cos(a), y: 60 + 40 * Math.sin(a) };
      });
      return (
        <>
          {pts.map((p, i) => {
            const q = pts[(i + 1) % n]!;
            const dx = q.x - p.x;
            const dy = q.y - p.y;
            const len = Math.hypot(dx, dy);
            return <Arrow key={`a${i}`} x1={f1(p.x + (dx / len) * 16)} y1={f1(p.y + (dy / len) * 14)} x2={f1(q.x - (dx / len) * 18)} y2={f1(q.y - (dy / len) * 15)} w={1.75} o={0.7} />;
          })}
          {pts.map((p, i) => (
            <rect key={i} x={f1(p.x - 12)} y={f1(p.y - 10)} width={24} height={20} rx={4} fill="currentColor" opacity={0.35 + (i % 3) * 0.25} />
          ))}
        </>
      );
    }
    case "E8": {
      // Requests joining and leaving a running batch over time.
      const bars = Array.from({ length: 7 }, (_, i) => {
        const start = 18 + r() * 110;
        return { y: 14 + i * 13, x: start, w: 40 + r() * 90 };
      });
      return (
        <>
          {bars.map((b, i) => (
            <rect key={i} x={f1(b.x)} y={b.y} width={f1(Math.min(b.w, 224 - b.x))} height={9} rx={4.5} fill="currentColor" opacity={0.25 + (i % 3) * 0.22} />
          ))}
          <line x1={148} y1={6} x2={148} y2={114} stroke="currentColor" strokeWidth={2.25} />
          <circle cx={148} cy={6} r={4} fill="currentColor" />
        </>
      );
    }
    case "E9": {
      // Shards of data streaming through one pipeline.
      return (
        <>
          {[22, 52, 82].map((y, i) => (
            <g key={y}>
              <ellipse cx={42} cy={y - 6} rx={20} ry={5} fill="currentColor" opacity={0.5} />
              <rect x={22} y={y - 6} width={40} height={16} fill="currentColor" opacity={0.22} />
              <ellipse cx={42} cy={y + 10} rx={20} ry={5} fill="currentColor" opacity={0.35} />
              <path d={`M66 ${y + 2} C 100 ${y + 2}, 104 60, 132 60`} fill="none" stroke="currentColor" strokeWidth={1.75} opacity={0.4 + i * 0.2} />
            </g>
          ))}
          <rect x={132} y={48} width={38} height={24} rx={6} fill="currentColor" />
          <Arrow x1={174} y1={60} x2={222} y2={60} w={2.25} />
        </>
      );
    }
    case "E10": {
      // Results with honest error bars against a baseline.
      const vals = [52, 64, 58, 78, 70];
      return (
        <>
          <line x1={18} y1={104} x2={222} y2={104} stroke="currentColor" strokeWidth={1.5} opacity={0.45} />
          <line x1={18} y1={50} x2={222} y2={50} stroke="currentColor" strokeWidth={1.5} strokeDasharray="5 5" opacity={0.6} />
          {vals.map((v, i) => {
            const x = 40 + i * 38;
            const e = 8 + r() * 8;
            return (
              <g key={i}>
                <rect x={x} y={104 - v} width={22} height={v} rx={3} fill="currentColor" opacity={i === 3 ? 0.85 : 0.3} />
                <line x1={x + 11} y1={f1(104 - v - e)} x2={x + 11} y2={f1(104 - v + e)} stroke="currentColor" strokeWidth={2} />
                <line x1={x + 6} y1={f1(104 - v - e)} x2={x + 16} y2={f1(104 - v - e)} stroke="currentColor" strokeWidth={2} />
                <line x1={x + 6} y1={f1(104 - v + e)} x2={x + 16} y2={f1(104 - v + e)} stroke="currentColor" strokeWidth={2} />
              </g>
            );
          })}
        </>
      );
    }
    default: {
      // Capstones and anything new: a flag on a path.
      return (
        <>
          <path d="M18 100 C 70 100, 80 60, 130 60 S 190 24, 214 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeDasharray="6 5" />
          <path d="M210 52 V14 l16 6 -16 6" fill="currentColor" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
          <circle cx={18} cy={100} r={5} fill="currentColor" />
        </>
      );
    }
  }
}

/** The background grid every drawing sits on: squared paper. */
function Grid() {
  const lines: ReactNode[] = [];
  for (let x = 12; x < W; x += 12) lines.push(<line key={`x${x}`} x1={x} y1={0} x2={x} y2={H} />);
  for (let y = 12; y < H; y += 12) lines.push(<line key={`y${y}`} x1={0} y1={y} x2={W} y2={y} />);
  return (
    <g stroke="currentColor" strokeWidth={0.5} opacity={0.1}>
      {lines}
    </g>
  );
}

export function CourseArt({ code, className }: { code: string; className?: string }) {
  const style = SUBJECT_STYLE[subjectOf(code)];
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className={clsx("block h-full w-full", style.soft, style.text, className)}
    >
      <Grid />
      {motif(code)}
    </svg>
  );
}

/** A course's code on its subject's colour: the compact mark for lists. */
export function CourseMark({ code, size = "md" }: { code: string; size?: "sm" | "md" | "lg" }) {
  const style = SUBJECT_STYLE[subjectOf(code)];
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "tabular inline-flex shrink-0 items-center justify-center rounded-md font-semibold",
        style.soft,
        style.text,
        size === "sm" && "h-6 min-w-8 px-1.5 text-xs",
        size === "md" && "size-10 text-sm",
        size === "lg" && "size-12 text-base",
      )}
    >
      {code}
    </span>
  );
}
