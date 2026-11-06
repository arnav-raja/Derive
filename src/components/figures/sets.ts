/*
 * The logic behind the set diagram: the four regions of two overlapping sets,
 * and set expressions written with ∪, ∩ and ᶜ, worked out as the regions they
 * cover. Kept apart from the drawing so that it can be tested on its own.
 */

/** The four regions of two overlapping sets A and B, in the order the figure lists them. */
export const REGIONS = ["both", "first", "second", "neither"] as const;
export type Region = (typeof REGIONS)[number];

/** A set as the figure names it: what its elements are, what the others are, and its letter. */
export type NamedSet = { name: string; not?: string; sym: string };

type Node =
  | { kind: "set"; index: 0 | 1 }
  | { kind: "universe" }
  | { kind: "empty" }
  | { kind: "complement"; of: Node }
  | { kind: "union" | "intersection"; left: Node; right: Node };

const COMPLEMENT = "ᶜ"; // ᶜ, a small raised c
const OPS: Record<string, "union" | "intersection"> = { "∪": "union", "∩": "intersection" };

/**
 * Reads an expression such as "(S ∪ E)ᶜ" or "S ∩ Eᶜ", in which the letters are
 * the two sets' symbols, U is every element and ∅ is the empty set. Union and
 * intersection may not be mixed without brackets, as on paper.
 */
export function parseSetExpression(text: string, syms: readonly [string, string]): Node {
  const tokens = [...text.replace(/\s+/g, "")];
  let at = 0;
  const fail = (why: string): never => {
    throw new Error(`Cannot read the set "${text}": ${why}.`);
  };

  function atom(): Node {
    const t = tokens[at];
    if (t === undefined) return fail("it ends too soon");
    at++;
    if (t === "(") {
      const inner = expression();
      if (tokens[at] !== ")") fail("a bracket is not closed");
      at++;
      return inner;
    }
    if (t === syms[0]) return { kind: "set", index: 0 };
    if (t === syms[1]) return { kind: "set", index: 1 };
    if (t === "U") return { kind: "universe" };
    if (t === "∅") return { kind: "empty" };
    return fail(`"${t}" is not one of its sets`);
  }

  function term(): Node {
    let node = atom();
    while (tokens[at] === COMPLEMENT) {
      at++;
      node = { kind: "complement", of: node };
    }
    return node;
  }

  function expression(): Node {
    let node = term();
    let first: "union" | "intersection" | null = null;
    while (tokens[at] !== undefined && OPS[tokens[at]!]) {
      const op = OPS[tokens[at]!]!;
      if (first && op !== first) fail("union and intersection are mixed without brackets");
      first = op;
      at++;
      node = { kind: op, left: node, right: term() };
    }
    return node;
  }

  if (syms.includes("U")) fail("U stands for every element, so it cannot name a set");
  const node = expression();
  if (at !== tokens.length) fail(`"${tokens[at]}" is out of place`);
  return node;
}

const IN: Record<0 | 1, Region[]> = { 0: ["both", "first"], 1: ["both", "second"] };

/** The regions an expression covers. */
export function regionsOf(node: Node): Set<Region> {
  switch (node.kind) {
    case "set":
      return new Set(IN[node.index]);
    case "universe":
      return new Set(REGIONS);
    case "empty":
      return new Set();
    case "complement": {
      const inner = regionsOf(node.of);
      return new Set(REGIONS.filter((r) => !inner.has(r)));
    }
    case "union": {
      const l = regionsOf(node.left);
      const r = regionsOf(node.right);
      return new Set(REGIONS.filter((x) => l.has(x) || r.has(x)));
    }
    case "intersection": {
      const l = regionsOf(node.left);
      const r = regionsOf(node.right);
      return new Set(REGIONS.filter((x) => l.has(x) && r.has(x)));
    }
  }
}

/** The expression in words, for a screen reader, which reads a raised c as a stray letter. */
export function spokenSet(node: Node, syms: readonly [string, string]): string {
  switch (node.kind) {
    case "set":
      return syms[node.index];
    case "universe":
      return "U";
    case "empty":
      return "the empty set";
    case "complement":
      return `the complement of ${spokenSet(node.of, syms)}`;
    case "union":
    case "intersection":
      return `the ${node.kind} of ${spokenSet(node.left, syms)} and ${spokenSet(node.right, syms)}`;
  }
}

/** The expression in TeX, as the lesson's prose writes it: S ∩ Eᶜ becomes S \cap E^c. */
export function setTex(text: string): string {
  return text
    .replace(/\s*∪\s*/g, " \\cup ")
    .replace(/\s*∩\s*/g, " \\cap ")
    .replace(/∅/g, "\\varnothing ")
    .replace(new RegExp(COMPLEMENT, "g"), "^c")
    .trim();
}

/** Lower-cases a name's first letter for use inside a sentence, but leaves "GPU" or "English" alone. */
export function lowerFirst(s: string): string {
  return /^[A-Z][a-z]/.test(s) ? s[0]!.toLowerCase() + s.slice(1) : s;
}

/** A region in words, from the two sets' names: "Short, not in English". */
export function regionName(region: Region, sets: readonly [NamedSet, NamedSet]): string {
  const [a, b] = sets;
  const yes = (s: NamedSet) => s.name;
  const no = (s: NamedSet) => s.not ?? `Not ${lowerFirst(s.name)}`;
  const pair = (x: string, y: string) => `${x}, ${lowerFirst(y)}`;
  switch (region) {
    case "both":
      return pair(yes(a), yes(b));
    case "first":
      return pair(yes(a), no(b));
    case "second":
      return pair(no(a), yes(b));
    case "neither":
      return pair(no(a), no(b));
  }
}

/** Joins words as a sentence does: "a", "a and b", "a, b and c". */
export function listWords(words: string[]): string {
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
}

/**
 * How a shading compares with a set: the regions rightly shaded, those shaded that are not in
 * it, and those in it left unshaded.
 */
export function compareShading(shaded: ReadonlySet<Region>, target: ReadonlySet<Region>) {
  const right = REGIONS.filter((r) => shaded.has(r) && target.has(r));
  const extra = REGIONS.filter((r) => shaded.has(r) && !target.has(r));
  const missing = REGIONS.filter((r) => !shaded.has(r) && target.has(r));
  return { ok: extra.length === 0 && missing.length === 0, right, extra, missing };
}

/** Whether two region sets are the same. */
export function sameRegions(a: ReadonlySet<Region>, b: ReadonlySet<Region>): boolean {
  return a.size === b.size && [...a].every((r) => b.has(r));
}
