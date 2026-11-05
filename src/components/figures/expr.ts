/*
 * A small, safe expression language for figures: numbers, variables, + - * /
 * and ^ (or **), unary minus, parentheses and a fixed set of functions. It
 * never evaluates JavaScript, so a lesson's figure props are only data.
 * Units can be carried through an expression, which is how figures check
 * dimensions honestly.
 */

export type ExprNode =
  | { kind: "num"; value: number; text: string }
  | { kind: "var"; name: string }
  | { kind: "const"; name: "pi" | "e"; value: number }
  | { kind: "neg"; arg: ExprNode }
  | { kind: "bin"; op: "+" | "-" | "*" | "/" | "^"; left: ExprNode; right: ExprNode }
  | { kind: "call"; fn: FnName; args: ExprNode[] };

const FUNCTIONS = {
  sin: [1, Math.sin],
  cos: [1, Math.cos],
  tan: [1, Math.tan],
  exp: [1, Math.exp],
  ln: [1, Math.log],
  log: [1, Math.log],
  log10: [1, Math.log10],
  log2: [1, Math.log2],
  sqrt: [1, Math.sqrt],
  abs: [1, Math.abs],
  floor: [1, Math.floor],
  ceil: [1, Math.ceil],
  round: [1, Math.round],
  min: [2, Math.min],
  max: [2, Math.max],
} as const satisfies Record<string, readonly [number, (...a: number[]) => number]>;

export type FnName = keyof typeof FUNCTIONS;

export class ExprError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExprError";
  }
}

type Token = { type: "num" | "id" | "op" | "(" | ")" | ","; text: string };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const num = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(src.slice(i));
    if (num) {
      tokens.push({ type: "num", text: num[0] });
      i += num[0].length;
      continue;
    }
    const id = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
    if (id) {
      tokens.push({ type: "id", text: id[0] });
      i += id[0].length;
      continue;
    }
    if (src.startsWith("**", i)) {
      tokens.push({ type: "op", text: "^" });
      i += 2;
      continue;
    }
    if ("+-*/^".includes(c)) tokens.push({ type: "op", text: c });
    else if (c === "×" || c === "·") tokens.push({ type: "op", text: "*" });
    else if (c === "−") tokens.push({ type: "op", text: "-" });
    else if (c === "(" || c === ")" || c === ",") tokens.push({ type: c, text: c });
    else throw new ExprError(`Unexpected character "${c}".`);
    i++;
  }
  return tokens;
}

/** Parses an expression, or throws ExprError with a plain message. */
export function parseExpr(src: string): ExprNode {
  const tokens = tokenize(src);
  let pos = 0;
  const peek = () => tokens[pos];
  const take = () => tokens[pos++];

  function expr(): ExprNode {
    let left = term();
    for (let t = peek(); t?.type === "op" && (t.text === "+" || t.text === "-"); t = peek()) {
      take();
      left = { kind: "bin", op: t.text as "+" | "-", left, right: term() };
    }
    return left;
  }
  function term(): ExprNode {
    let left = unary();
    for (let t = peek(); t?.type === "op" && (t.text === "*" || t.text === "/"); t = peek()) {
      take();
      left = { kind: "bin", op: t.text as "*" | "/", left, right: unary() };
    }
    return left;
  }
  function unary(): ExprNode {
    const t = peek();
    if (t?.type === "op" && t.text === "-") {
      take();
      return { kind: "neg", arg: unary() };
    }
    if (t?.type === "op" && t.text === "+") {
      take();
      return unary();
    }
    return power();
  }
  function power(): ExprNode {
    const base = atom();
    const t = peek();
    if (t?.type === "op" && t.text === "^") {
      take();
      return { kind: "bin", op: "^", left: base, right: unary() };
    }
    return base;
  }
  function atom(): ExprNode {
    const t = take();
    if (!t) throw new ExprError("The expression ends too soon.");
    if (t.type === "num") return { kind: "num", value: Number(t.text), text: t.text };
    if (t.type === "(") {
      const inner = expr();
      if (take()?.type !== ")") throw new ExprError("A bracket is not closed.");
      return inner;
    }
    if (t.type === "id") {
      if (peek()?.type === "(") {
        if (!(t.text in FUNCTIONS)) throw new ExprError(`There is no function called ${t.text}.`);
        take();
        const args: ExprNode[] = [];
        if (peek()?.type !== ")") {
          args.push(expr());
          while (peek()?.type === ",") {
            take();
            args.push(expr());
          }
        }
        if (take()?.type !== ")") throw new ExprError(`The bracket after ${t.text} is not closed.`);
        const fn = t.text as FnName;
        if (args.length !== FUNCTIONS[fn][0]) {
          throw new ExprError(`${fn} takes ${FUNCTIONS[fn][0]} argument${FUNCTIONS[fn][0] === 1 ? "" : "s"}.`);
        }
        return { kind: "call", fn, args };
      }
      if (t.text === "pi") return { kind: "const", name: "pi", value: Math.PI };
      if (t.text === "e") return { kind: "const", name: "e", value: Math.E };
      return { kind: "var", name: t.text };
    }
    throw new ExprError(`Unexpected "${t.text}".`);
  }

  const node = expr();
  if (pos < tokens.length) throw new ExprError(`Unexpected "${tokens[pos]!.text}".`);
  return node;
}

function applyOp(op: "+" | "-" | "*" | "/" | "^", a: number, b: number): number {
  if (op === "+") return a + b;
  if (op === "-") return a - b;
  if (op === "*") return a * b;
  if (op === "/") return a / b;
  return a ** b;
}

export function evaluate(node: ExprNode, scope: Record<string, number>): number {
  switch (node.kind) {
    case "num":
    case "const":
      return node.value;
    case "var": {
      const v = scope[node.name];
      if (v === undefined) throw new ExprError(`${node.name} has no value.`);
      return v;
    }
    case "neg":
      return -evaluate(node.arg, scope);
    case "bin":
      return applyOp(node.op, evaluate(node.left, scope), evaluate(node.right, scope));
    case "call": {
      const [, f] = FUNCTIONS[node.fn];
      return (f as (...a: number[]) => number)(...node.args.map((a) => evaluate(a, scope)));
    }
  }
}

/**
 * A node's value from its children's values, for evaluators that change each value on the way
 * up, such as a calculator that rounds every result.
 */
export function combineValues(node: ExprNode, kids: number[], scope: Record<string, number>): number {
  switch (node.kind) {
    case "bin":
      return applyOp(node.op, kids[0]!, kids[1]!);
    case "neg":
      return -kids[0]!;
    case "call": {
      const [, f] = FUNCTIONS[node.fn];
      return (f as (...a: number[]) => number)(...kids);
    }
    default:
      return evaluate(node, scope);
  }
}

/** Rounds to a number of significant figures, as a calculator that keeps only that many digits does. */
export function roundSig(v: number, figures: number): number {
  return Number.isFinite(v) && v !== 0 ? Number(v.toPrecision(figures)) : v;
}

/** A value as such a calculator shows it, trailing zeros included: "1.00", "0.00800". */
export function sigText(v: number, figures: number): string {
  if (!Number.isFinite(v)) return formatValue(v);
  if (v === 0) return "0";
  const abs = Math.abs(v);
  if (abs >= 1e6 || abs < 1e-3) return formatValue(v, figures);
  return v.toPrecision(figures);
}

/** A compiled expression: parse once, evaluate many times. */
export function compileExpr(src: string): (scope: Record<string, number>) => number {
  const node = parseExpr(src);
  return (scope) => evaluate(node, scope);
}

export function variablesOf(node: ExprNode, out = new Set<string>()): Set<string> {
  if (node.kind === "var") out.add(node.name);
  else if (node.kind === "neg") variablesOf(node.arg, out);
  else if (node.kind === "bin") {
    variablesOf(node.left, out);
    variablesOf(node.right, out);
  } else if (node.kind === "call") for (const a of node.args) variablesOf(a, out);
  return out;
}

const PRECEDENCE = { "+": 1, "-": 1, "*": 2, "/": 2, "^": 3 } as const;

function prec(node: ExprNode): number {
  if (node.kind === "bin") return PRECEDENCE[node.op];
  if (node.kind === "neg") return 2.5;
  return 4;
}

const SHOW_OP = { "+": "+", "-": "−", "*": "×", "/": "÷", "^": "^" } as const;

/** The expression written out, with the fewest brackets that keep its meaning. */
export function exprText(node: ExprNode): string {
  switch (node.kind) {
    case "num":
      return node.text;
    case "var":
      return node.name;
    case "const":
      return node.name === "pi" ? "π" : "e";
    case "neg": {
      const inner = exprText(node.arg);
      return prec(node.arg) < 3 ? `−(${inner})` : `−${inner}`;
    }
    case "call":
      return `${node.fn}(${node.args.map(exprText).join(", ")})`;
    case "bin": {
      const p = PRECEDENCE[node.op];
      // The text must show the tree exactly, so brackets stay wherever they
      // change the shape: ^ groups to the right, so (a^b)^c keeps them, and the
      // others group to the left, so a + (b + c) and a − (b − c) keep them, even
      // where the value would be the same without.
      const needLeft = prec(node.left) < p || (node.op === "^" && prec(node.left) === p);
      const needRight = prec(node.right) < p || (prec(node.right) === p && node.op !== "^");
      const l = needLeft ? `(${exprText(node.left)})` : exprText(node.left);
      const r = needRight ? `(${exprText(node.right)})` : exprText(node.right);
      return node.op === "^" ? `${l}^${r}` : `${l} ${SHOW_OP[node.op]} ${r}`;
    }
  }
}

// Units -----------------------------------------------------------------------

/** A unit as powers of named base units: { FLOP: 1, s: -1 } is FLOP/s. */
export type Unit = Record<string, number>;

/** Parses "FLOP/s", "kg*m^2/s^2", "1/s" or "1" (no unit). */
export function parseUnit(text: string): Unit {
  const unit: Unit = {};
  const t = text.replace(/\s+/g, "");
  if (!t || t === "1") return unit;
  const [num = "", ...dens] = t.split("/");
  const add = (part: string, sign: number) => {
    for (const factor of part.split(/[*·]/)) {
      if (!factor || factor === "1") continue;
      const m = /^([A-Za-z_][A-Za-z0-9_]*)(?:\^(-?\d+(?:\.\d+)?))?$/.exec(factor);
      if (!m) throw new ExprError(`"${factor}" is not a unit Derive can read.`);
      unit[m[1]!] = (unit[m[1]!] ?? 0) + sign * Number(m[2] ?? 1);
    }
  };
  add(num, 1);
  for (const d of dens) add(d, -1);
  for (const k of Object.keys(unit)) if (unit[k] === 0) delete unit[k];
  return unit;
}

function sameUnit(a: Unit, b: Unit): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if (Math.abs((a[k] ?? 0) - (b[k] ?? 0)) > 1e-9) return false;
  return true;
}

function scaleUnit(u: Unit, by: number): Unit {
  const out: Unit = {};
  for (const [k, v] of Object.entries(u)) if (v * by !== 0) out[k] = v * by;
  return out;
}

function combine(a: Unit, b: Unit, sign: 1 | -1): Unit {
  const out: Unit = { ...a };
  for (const [k, v] of Object.entries(b)) {
    out[k] = (out[k] ?? 0) + sign * v;
    if (Math.abs(out[k]!) < 1e-9) delete out[k];
  }
  return out;
}

function fmtPower(base: string, p: number): string {
  return p === 1 ? base : `${base}^${Number.isInteger(p) ? p : p.toFixed(2)}`;
}

/** "FLOP/s", "kg·m^2/s^2", "1/s", or "no unit". */
export function unitText(u: Unit): string {
  const entries = Object.entries(u).sort(([a], [b]) => a.localeCompare(b));
  const up = entries.filter(([, p]) => p > 0).map(([k, p]) => fmtPower(k, p));
  const down = entries.filter(([, p]) => p < 0).map(([k, p]) => fmtPower(k, -p));
  if (!up.length && !down.length) return "no unit";
  const top = up.length ? up.join("·") : "1";
  if (!down.length) return top;
  return `${top}/${down.length > 1 ? `(${down.join("·")})` : down[0]}`;
}

export type UnitResult = { ok: true; unit: Unit } | { ok: false; message: string };

/** A unit in a sentence: "s", or "a pure number". */
function kindText(u: Unit): string {
  return Object.keys(u).length ? unitText(u) : "a pure number";
}

/** The unit of an expression, or why its units do not combine. */
export function unitOf(node: ExprNode, units: Record<string, Unit>, scope: Record<string, number> = {}): UnitResult {
  const go = (n: ExprNode): UnitResult => {
    switch (n.kind) {
      case "num":
      case "const":
        return { ok: true, unit: {} };
      case "var":
        return { ok: true, unit: units[n.name] ?? {} };
      case "neg":
        return go(n.arg);
      case "call": {
        const args = n.args.map(go);
        const bad = args.find((a) => !a.ok);
        if (bad) return bad;
        const us = args.map((a) => (a as { ok: true; unit: Unit }).unit);
        if (["abs", "floor", "ceil", "round"].includes(n.fn)) return { ok: true, unit: us[0]! };
        if (n.fn === "sqrt") return { ok: true, unit: scaleUnit(us[0]!, 0.5) };
        if (n.fn === "min" || n.fn === "max") {
          return sameUnit(us[0]!, us[1]!)
            ? { ok: true, unit: us[0]! }
            : { ok: false, message: `${n.fn} compares ${kindText(us[0]!)} with ${kindText(us[1]!)}, which are different kinds of thing.` };
        }
        if (Object.keys(us[0]!).length) {
          return { ok: false, message: `${n.fn} needs a pure number, but it is given ${unitText(us[0]!)}.` };
        }
        return { ok: true, unit: {} };
      }
      case "bin": {
        const a = go(n.left);
        if (!a.ok) return a;
        const b = go(n.right);
        if (!b.ok) return b;
        if (n.op === "+" || n.op === "-") {
          return sameUnit(a.unit, b.unit)
            ? { ok: true, unit: a.unit }
            : {
                ok: false,
                message: `This ${n.op === "+" ? "adds" : "subtracts"} ${kindText(b.unit)} ${n.op === "+" ? "to" : "from"} ${kindText(a.unit)}, which cannot be done.`,
              };
        }
        if (n.op === "*") return { ok: true, unit: combine(a.unit, b.unit, 1) };
        if (n.op === "/") return { ok: true, unit: combine(a.unit, b.unit, -1) };
        // A power: the exponent must be a pure number, and a unit can only be
        // raised to a known number.
        if (Object.keys(b.unit).length) return { ok: false, message: `An exponent must be a pure number, not ${unitText(b.unit)}.` };
        if (!Object.keys(a.unit).length) return { ok: true, unit: {} };
        let p: number;
        try {
          p = evaluate(n.right, scope);
        } catch {
          return { ok: false, message: "A quantity with a unit can only be raised to a known number." };
        }
        return { ok: true, unit: scaleUnit(a.unit, p) };
      }
    }
  };
  return go(node);
}

// Numbers ---------------------------------------------------------------------

const SUPERSCRIPT: Record<string, string> = {
  "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻",
};

function superscript(n: number): string {
  return String(n).split("").map((c) => SUPERSCRIPT[c] ?? c).join("");
}

/** A number as people read it: 3.15 × 10²³, 86,400, 0.25. */
export function formatValue(v: number, digits = 3): string {
  if (!Number.isFinite(v)) return Number.isNaN(v) ? "undefined" : v > 0 ? "infinity" : "minus infinity";
  if (v === 0) return "0";
  const abs = Math.abs(v);
  if (abs >= 1e6 || abs < 1e-3) {
    const exp = Math.floor(Math.log10(abs));
    let mantissa = v / 10 ** exp;
    // Rounding can carry the mantissa to 10.
    if (Math.abs(Number(mantissa.toPrecision(digits))) >= 10) {
      mantissa /= 10;
      return `${Number(mantissa.toPrecision(digits))} × 10${superscript(exp + 1)}`;
    }
    return `${Number(mantissa.toPrecision(digits))} × 10${superscript(exp)}`;
  }
  // Digits are grouped in threes, as in the lesson text and scientific writing: 31,557,600.
  return Number(v.toPrecision(Math.max(digits, Math.floor(Math.log10(abs)) + 1))).toLocaleString("en-GB", {
    maximumFractionDigits: 6,
  });
}

/** The same, in words a screen reader says well: "3.15 times 10 to the 23". */
export function spokenValue(v: number, digits = 3): string {
  if (!Number.isFinite(v) || v === 0) return formatValue(v, digits);
  const abs = Math.abs(v);
  if (abs >= 1e6 || abs < 1e-3) {
    const exp = Math.floor(Math.log10(abs));
    const mantissa = Number((v / 10 ** exp).toPrecision(digits));
    return `${mantissa} times 10 to the ${exp}`;
  }
  return formatValue(v, digits);
}

/** Reads a typed number: 3e23, 3 × 10^23, 3*10**23, 3,15,000 or 0.25. */
export function parseLooseNumber(text: string): number {
  const t = text.trim().replace(/[,\s]/g, "").replace(/−/g, "-");
  if (!t) return Number.NaN;
  const power = /^(-?\d*\.?\d*)(?:×|x|\*|·)10(?:\^|\*\*)\{?([-+]?\d+)\}?$/.exec(t);
  if (power) {
    const m = power[1] === "" || power[1] === "-" ? `${power[1]}1` : power[1]!;
    return Number(`${m}e${power[2]}`);
  }
  const bare = /^10(?:\^|\*\*)\{?([-+]?\d+)\}?$/.exec(t);
  if (bare) return Number(`1e${bare[1]}`);
  return /^-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(t) ? Number(t) : Number.NaN;
}
