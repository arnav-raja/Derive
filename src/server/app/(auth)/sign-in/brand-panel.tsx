import { Wordmark } from "@/components/shell/wordmark";
import { DeriveIcon, ExplainIcon, RecallIcon } from "@/components/ui/icons";

/*
 * The sign-in page's left half: Derive's promise and its three working
 * rules, on the dark workbench colours so it reads the same in both themes.
 * The drawing is our own: gradient descent zigzagging down a narrow valley
 * of a loss surface to its minimum.
 */

const RINGS = [30, 62, 98, 138, 182, 230];
const PATH: [number, number][] = [
  [123.9, 288.0],
  [146.1, 170.7],
  [211.2, 211.6],
  [226.1, 163.9],
  [255.6, 177.8],
  [264.4, 158.3],
  [277.9, 162.7],
  [282.8, 154.6],
  [289.0, 155.9],
  [291.6, 152.5],
  [300.0, 150.0],
];

function DescentDrawing({ className }: { className?: string }) {
  const steps = PATH.slice(0, -1);
  return (
    <svg viewBox="0 0 520 320" aria-hidden="true" focusable="false" className={className}>
      <g fill="none" strokeWidth="1.25" className="stroke-code-muted">
        {RINGS.map((rx, i) => (
          <ellipse
            key={rx}
            cx="300"
            cy="150"
            rx={rx}
            ry={rx * 0.42}
            transform="rotate(-22 300 150)"
            opacity={0.5 - i * 0.065}
          />
        ))}
      </g>
      <polyline
        points={PATH.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-code-keyword"
      />
      {steps.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 0 ? 5 : 3.5} strokeWidth="2" className="fill-code-bg stroke-code-keyword" />
      ))}
      <circle cx="300" cy="150" r="7" className="fill-code-string" />
      <circle cx="300" cy="150" r="13" fill="none" strokeWidth="1.5" className="stroke-code-string" opacity="0.45" />
      <text x="138" y="300" className="fill-code-muted font-mono text-sm">start</text>
      <text x="318" y="140" className="fill-code-string font-mono text-sm">minimum</text>
    </svg>
  );
}

const RULES = [
  { Icon: DeriveIcon, title: "Rebuild it", body: "You produce each idea yourself before it is named." },
  { Icon: ExplainIcon, title: "Explain it simply", body: "Every lesson ends in your own plain explanation." },
  { Icon: RecallIcon, title: "Never fool yourself", body: "Spaced review checks what you really remember." },
];

export function BrandPanel() {
  return (
    <aside className="relative hidden min-h-dvh flex-col justify-between gap-10 overflow-hidden border-r border-code-rule bg-code-bg px-10 py-10 lg:flex xl:px-14 xl:py-12">
      <Wordmark tone="inverse" size="lg" />
      <div className="flex max-w-xl flex-col gap-8">
        <div className="rounded-xl border border-code-rule bg-code-chrome/60 p-4">
          <DescentDrawing className="h-auto w-full" />
          <p className="border-t border-code-rule px-2 pt-3 font-mono text-sm text-code-muted">
            <span className="text-code-function">θ</span> <span className="text-code-ink">←</span> <span className="text-code-function">θ</span>{" "}
            <span className="text-code-ink">−</span> <span className="text-code-number">η</span> <span className="text-code-ink">∇L(θ)</span>
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="text-3xl font-semibold tracking-tight text-code-ink xl:text-4xl">Learn it by deriving it.</h2>
          <p className="max-w-lg text-base text-code-muted">
            The mathematics, machine learning and ML engineering used at frontier AI labs, rebuilt from first principles.
          </p>
        </div>
        <ul className="grid gap-5 xl:grid-cols-3">
          {RULES.map(({ Icon, title, body }) => (
            <li key={title} className="flex gap-3 xl:flex-col">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-code-chrome text-code-keyword">
                <Icon className="size-4" />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-code-ink">{title}</span>
                <span className="text-sm text-code-muted">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-code-muted">A private school for one learner.</p>
    </aside>
  );
}
