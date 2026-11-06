/*
 * The wire format between Derive's server (a Supabase Edge Function, or the
 * local server in development and tests) and the browser.
 *
 * GitHub Pages serves only fixed files, so pages are no longer rendered by a
 * Next.js server. The server renders a page's server components itself and
 * sends the result as JSON: plain values, host elements such as <div>, and
 * references to client components, which the browser loads and renders. Server
 * actions passed as props travel as references the browser calls back with.
 *
 * Plain JSON values travel as they are. Everything else is an object with a
 * "$w" tag: undefined, special numbers, dates, maps, sets, form data,
 * elements, client references and action references. An object that happens
 * to have a "$w" key of its own is wrapped, so nothing is ever misread.
 */

export type WireValue = null | boolean | number | string | WireValue[] | { [key: string]: WireValue };

export const TAG = "$w";

/** An element: a host tag, "#f" for a fragment, or a client component reference. */
export type WireElement = { $w: "e"; t: string | { c: string }; k: string | null; p: { [key: string]: WireValue } };

export class WireError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WireError";
  }
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Encodes a value that is not a React element, a client reference or a function. */
export function encodeScalar(value: unknown, path: string): WireValue | typeof NOT_SCALAR {
  if (value === null) return null;
  switch (typeof value) {
    case "boolean":
    case "string":
      return value;
    case "number":
      if (Number.isNaN(value)) return { $w: "n", v: "NaN" };
      if (value === Infinity) return { $w: "n", v: "Infinity" };
      if (value === -Infinity) return { $w: "n", v: "-Infinity" };
      if (Object.is(value, -0)) return { $w: "n", v: "-0" };
      return value;
    case "undefined":
      return { $w: "u" };
    case "bigint":
      return { $w: "b", v: value.toString() };
    case "symbol":
      throw new WireError(`${path} is a symbol, which cannot be sent to the browser.`);
  }
  if (value instanceof Date) return { $w: "d", v: Number.isNaN(value.getTime()) ? "" : value.toISOString() };
  return NOT_SCALAR;
}

export const NOT_SCALAR = Symbol("not scalar");

/**
 * Encodes plain data: action arguments from the browser, and action results.
 * Elements and functions are refused; the server's renderer handles those.
 */
export function encodeValue(value: unknown, path = "value"): WireValue {
  const scalar = encodeScalar(value, path);
  if (scalar !== NOT_SCALAR) return scalar;
  if (typeof value === "function") throw new WireError(`${path} is a function, which cannot be sent.`);
  if (Array.isArray(value)) return value.map((v, i) => encodeValue(v, `${path}[${i}]`));
  if (value instanceof Map) return { $w: "m", v: [...value].map(([k, v], i) => [encodeValue(k, `${path} key ${i}`), encodeValue(v, `${path}.get(${String(k)})`)]) };
  if (value instanceof Set) return { $w: "s", v: [...value].map((v, i) => encodeValue(v, `${path} item ${i}`)) };
  if (typeof FormData !== "undefined" && value instanceof FormData) {
    const entries: WireValue[] = [];
    for (const [k, v] of value.entries()) {
      if (typeof v !== "string") throw new WireError(`${path} holds a file, which cannot be sent.`);
      entries.push([k, v]);
    }
    return { $w: "f", v: entries };
  }
  if (isPlainObject(value)) return encodeObject(value, path, (v, p) => encodeValue(v, p));
  throw new WireError(`${path} is a ${Object.prototype.toString.call(value)}, which cannot be sent.`);
}

export function encodeObject(
  value: Record<string, unknown>,
  path: string,
  each: (v: unknown, path: string) => WireValue,
): WireValue {
  const out: { [key: string]: WireValue } = {};
  for (const [k, v] of Object.entries(value)) out[k] = each(v, `${path}.${k}`);
  return TAG in value ? { $w: "o", v: out } : out;
}

export type DecodeHooks = {
  element?: (type: string | { c: string }, key: string | null, props: Record<string, unknown>) => unknown;
  action?: (id: string, bound: unknown[]) => unknown;
  client?: (id: string) => unknown;
};

/** Decodes any wire value. Elements, client references and actions need their hooks. */
export function decodeValue(wire: WireValue, hooks: DecodeHooks = {}): unknown {
  if (wire === null || typeof wire !== "object") return wire;
  if (Array.isArray(wire)) return wire.map((w) => decodeValue(w, hooks));
  const tag = wire[TAG];
  if (typeof tag !== "string") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(wire)) out[k] = decodeValue(v, hooks);
    return out;
  }
  const v = (wire as { v?: WireValue }).v;
  switch (tag) {
    case "u":
      return undefined;
    case "n":
      return v === "-0" ? -0 : Number(v);
    case "b":
      return BigInt(String(v));
    case "d":
      return v ? new Date(String(v)) : new Date(Number.NaN);
    case "m":
      return new Map((v as WireValue[][]).map(([k, x]) => [decodeValue(k!, hooks), decodeValue(x!, hooks)]));
    case "s":
      return new Set((v as WireValue[]).map((x) => decodeValue(x, hooks)));
    case "f": {
      const form = new FormData();
      for (const [k, x] of v as [string, string][]) form.append(k, x);
      return form;
    }
    case "o": {
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v as Record<string, WireValue>)) out[k] = decodeValue(x, hooks);
      return out;
    }
    case "e": {
      const el = wire as unknown as WireElement;
      if (!hooks.element) throw new WireError("An element arrived where only data was expected.");
      const props: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(el.p)) props[k] = decodeValue(x, hooks);
      return hooks.element(el.t, el.k, props);
    }
    case "a": {
      const a = wire as { id: string; b: WireValue[] };
      if (!hooks.action) throw new WireError("An action arrived where only data was expected.");
      return hooks.action(a.id, a.b.map((x) => decodeValue(x, hooks)));
    }
    case "c": {
      const c = wire as { id: string };
      if (!hooks.client) throw new WireError("A component arrived where only data was expected.");
      return hooks.client(c.id);
    }
  }
  throw new WireError(`Unknown wire tag ${tag}.`);
}

/** Every client module a wire value refers to, so the browser can load them before rendering. */
export function clientModules(wire: WireValue, into = new Set<string>()): Set<string> {
  if (wire === null || typeof wire !== "object") return into;
  if (Array.isArray(wire)) {
    for (const w of wire) clientModules(w, into);
    return into;
  }
  if (wire[TAG] === "e") {
    const t = (wire as unknown as WireElement).t;
    if (typeof t === "object") into.add(moduleOf(t.c));
  } else if (wire[TAG] === "c") {
    into.add(moduleOf(String((wire as { id: string }).id)));
  }
  for (const v of Object.values(wire)) clientModules(v, into);
  return into;
}

/** A client reference is "<module>#<export>". */
export function moduleOf(ref: string): string {
  const i = ref.lastIndexOf("#");
  return i < 0 ? ref : ref.slice(0, i);
}

export function exportOf(ref: string): string {
  const i = ref.lastIndexOf("#");
  return i < 0 ? "default" : ref.slice(i + 1);
}

/** What the server answers for a page or an action. */
export type WireResponse =
  | { kind: "page"; tree: WireValue; title: string | null }
  | { kind: "redirect"; to: string }
  | { kind: "not-found" }
  | { kind: "error"; message: string; status: number };

export type ActionResponse =
  | { kind: "result"; value: WireValue; page: Extract<WireResponse, { kind: "page" }> | null; refresh: boolean }
  | { kind: "redirect"; to: string }
  | { kind: "not-found" }
  | { kind: "error"; message: string; status: number };
