/**
 * Turns short TeX into plain Unicode text, for places that cannot render KaTeX, such as the
 * options of a native select. It handles the small set of commands that rule labels use and
 * leaves anything it does not know as readable text rather than raw backslashes.
 */

const SYMBOLS: Record<string, string> = {
  div: "÷",
  times: "×",
  cdot: "·",
  pm: "±",
  mp: "∓",
  le: "≤",
  leq: "≤",
  ge: "≥",
  geq: "≥",
  ne: "≠",
  neq: "≠",
  approx: "≈",
  equiv: "≡",
  propto: "∝",
  infty: "∞",
  to: "→",
  rightarrow: "→",
  Rightarrow: "⇒",
  iff: "⇔",
  Leftrightarrow: "⇔",
  in: "∈",
  notin: "∉",
  subset: "⊂",
  subseteq: "⊆",
  cup: "∪",
  cap: "∩",
  emptyset: "∅",
  varnothing: "∅",
  setminus: "∖",
  supseteq: "⊇",
  forall: "∀",
  exists: "∃",
  neg: "¬",
  land: "∧",
  lor: "∨",
  sum: "Σ",
  prod: "Π",
  int: "∫",
  partial: "∂",
  nabla: "∇",
  ldots: "…",
  cdots: "⋯",
  dots: "…",
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ε",
  varepsilon: "ε",
  theta: "θ",
  lambda: "λ",
  mu: "μ",
  pi: "π",
  rho: "ρ",
  sigma: "σ",
  tau: "τ",
  phi: "φ",
  varphi: "φ",
  omega: "ω",
  Delta: "Δ",
  Sigma: "Σ",
  Omega: "Ω",
  log: "log",
  ln: "ln",
  exp: "exp",
  sin: "sin",
  cos: "cos",
  tan: "tan",
  max: "max",
  min: "min",
  lim: "lim",
  // Commands that only set the size or spacing of what follows say nothing of their own.
  displaystyle: "",
  textstyle: "",
  scriptstyle: "",
  limits: "",
  nolimits: "",
  quad: " ",
  qquad: " ",
};

const SUPERSCRIPT: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
  "+": "⁺", "-": "⁻", "=": "⁼", "(": "⁽", ")": "⁾",
  a: "ᵃ", b: "ᵇ", c: "ᶜ", d: "ᵈ", e: "ᵉ", f: "ᶠ", g: "ᵍ", h: "ʰ", i: "ⁱ", j: "ʲ", k: "ᵏ", l: "ˡ",
  m: "ᵐ", n: "ⁿ", o: "ᵒ", p: "ᵖ", r: "ʳ", s: "ˢ", t: "ᵗ", u: "ᵘ", v: "ᵛ", w: "ʷ", x: "ˣ", y: "ʸ",
  z: "ᶻ",
};

const SUBSCRIPT: Record<string, string> = {
  "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
  "+": "₊", "-": "₋", "=": "₌", "(": "₍", ")": "₎",
  a: "ₐ", e: "ₑ", h: "ₕ", i: "ᵢ", j: "ⱼ", k: "ₖ", l: "ₗ", m: "ₘ", n: "ₙ", o: "ₒ", p: "ₚ", r: "ᵣ",
  s: "ₛ", t: "ₜ", u: "ᵤ", v: "ᵥ", x: "ₓ",
};

function script(text: string, table: Record<string, string>, marker: "^" | "_"): string {
  const compact = text.replace(/\s+/g, "");
  const chars = [...compact];
  if (chars.length > 0 && chars.every((c) => c in table)) return chars.map((c) => table[c]).join("");
  return chars.length === 1 ? `${marker}${compact}` : `${marker}(${text.trim()})`;
}

function group(text: string): string {
  const trimmed = text.trim();
  return /^[\p{L}\p{N}.]+$/u.test(trimmed) ? trimmed : `(${trimmed})`;
}

/** Converts TeX such as `10^a \div 10^b = 10^{a-b}` into `10ᵃ ÷ 10ᵇ = 10ᵃ⁻ᵇ`. */
export function texToText(tex: string): string {
  let s = tex;
  // Innermost groups first, so nested commands resolve from the inside out.
  for (let pass = 0; pass < 6; pass += 1) {
    const before = s;
    s = s.replace(/\\(?:text|mathrm|mathbf|mathit|operatorname|textbf|textit)\{([^{}]*)\}/g, "$1");
    s = s.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, (_m, a: string, b: string) => `${group(a)}/${group(b)}`);
    s = s.replace(/\\sqrt\{([^{}]*)\}/g, (_m, a: string) => `√${group(a)}`);
    // n choose k has no plain sign of its own, so it is written C(n, k).
    s = s.replace(/\\[dt]?binom\{([^{}]*)\}\{([^{}]*)\}/g, (_m, a: string, b: string) => `C(${a.trim()}, ${b.trim()})`);
    s = s.replace(/\^\{([^{}]*)\}/g, (_m, a: string) => script(a, SUPERSCRIPT, "^"));
    s = s.replace(/_\{([^{}]*)\}/g, (_m, a: string) => script(a, SUBSCRIPT, "_"));
    // Any other command applied to a group, such as \hat{x}, keeps only its argument.
    s = s.replace(/\\(?!(?:[dt]?frac|sqrt|[dt]?binom)\{)([a-zA-Z]+)\{([^{}]*)\}/g, (_m, name: string, a: string) => `${SYMBOLS[name] ?? ""}${a}`);
    if (s === before) break;
  }
  s = s.replace(/\^\\([a-zA-Z]+)/g, (_m, name: string) => `^${SYMBOLS[name] ?? name}`);
  s = s.replace(/\^([\p{L}\p{N}])/gu, (_m, a: string) => script(a, SUPERSCRIPT, "^"));
  s = s.replace(/_([\p{L}\p{N}])/gu, (_m, a: string) => script(a, SUBSCRIPT, "_"));
  s = s.replace(/\\left|\\right|\\big|\\Big/g, "");
  s = s.replace(/\\[,;:!> ]/g, " ");
  s = s.replace(/\\\\/g, " ");
  s = s.replace(/\\([a-zA-Z]+)/g, (_m, name: string) => SYMBOLS[name] ?? name);
  s = s.replace(/\\([{}%$&#_])/g, "$1");
  s = s.replace(/[{}]/g, "");
  return s.replace(/\s+/g, " ").trim();
}

/** Plain text for an inline Markdown label that may hold `$...$` maths or `code`. */
export function labelToText(label: string): string {
  return label
    .split(/(`[^`]*`)/g)
    .map((part) => {
      if (part.length >= 2 && part.startsWith("`") && part.endsWith("`")) return part.slice(1, -1);
      return part
        .replace(/\$\$([^$]*)\$\$|\$([^$]*)\$/g, (_m, display: string | undefined, inline: string | undefined) =>
          texToText(display ?? inline ?? ""),
        )
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/__([^_]+)__/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/(^|[^\p{L}\p{N}])_([^_]+)_(?![\p{L}\p{N}])/gu, "$1$2");
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
