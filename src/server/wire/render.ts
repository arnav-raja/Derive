import * as React from "react";

import { NOT_SCALAR, encodeObject, encodeScalar, isPlainObject, type WireValue } from "@/lib/wire/codec";

import { actionReference, isClientReference } from "./refs";

/*
 * Renders a tree of server components into the wire format. Host elements and
 * client component references are kept as elements; server components (plain
 * or async functions) are called and their output rendered in turn, the way a
 * React Server Components renderer does. Server components may use the hooks
 * React allows there (useId, useMemo, useCallback, useContext for a default);
 * any other hook is a mistake, and the error says which component made it.
 */

const ELEMENT = Symbol.for("react.transitional.element");
const LEGACY_ELEMENT = Symbol.for("react.element");
const FRAGMENT = Symbol.for("react.fragment");
const FORWARD_REF = Symbol.for("react.forward_ref");
const MEMO = Symbol.for("react.memo");
const SUSPENSE = Symbol.for("react.suspense");
const STRICT_MODE = Symbol.for("react.strict_mode");
const PROFILER = Symbol.for("react.profiler");
const CONTEXT = Symbol.for("react.context");
const LAZY = Symbol.for("react.lazy");

type AnyElement = { $$typeof: symbol; type: unknown; key: string | null; props: Record<string, unknown> };

function isElement(value: unknown): value is AnyElement {
  if (value === null || typeof value !== "object") return false;
  const t = (value as { $$typeof?: unknown }).$$typeof;
  return t === ELEMENT || t === LEGACY_ELEMENT;
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return value !== null && (typeof value === "object" || typeof value === "function") && typeof (value as { then?: unknown }).then === "function";
}

type Internals = { H: unknown };
const internals = (React as unknown as { __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: Internals })
  .__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

type Context = { _currentValue: unknown };

function dispatcher(state: { ids: number; component: string }) {
  const refuse = (hook: string) => () => {
    throw new Error(`${state.component} calls ${hook}, which only a client component may; mark its module "use client".`);
  };
  return {
    readContext: (ctx: Context) => ctx._currentValue,
    useContext: (ctx: Context) => ctx._currentValue,
    use: (usable: unknown) => {
      if (usable && (usable as { $$typeof?: unknown }).$$typeof === CONTEXT) return (usable as Context)._currentValue;
      return refuse("use() with a promise")();
    },
    useCallback: <T>(fn: T) => fn,
    useMemo: <T>(make: () => T) => make(),
    useId: () => `«s${(state.ids++).toString(32)}»`,
    useDebugValue: () => {},
    useState: refuse("useState"),
    useReducer: refuse("useReducer"),
    useRef: refuse("useRef"),
    useEffect: refuse("useEffect"),
    useLayoutEffect: refuse("useLayoutEffect"),
    useInsertionEffect: refuse("useInsertionEffect"),
    useImperativeHandle: refuse("useImperativeHandle"),
    useTransition: refuse("useTransition"),
    useDeferredValue: refuse("useDeferredValue"),
    useSyncExternalStore: refuse("useSyncExternalStore"),
    useOptimistic: refuse("useOptimistic"),
    useActionState: refuse("useActionState"),
    useFormState: refuse("useFormState"),
    useEffectEvent: refuse("useEffectEvent"),
    useHostTransitionStatus: refuse("useFormStatus"),
    useCacheRefresh: refuse("useCacheRefresh"),
    useMemoCache: refuse("useMemoCache"),
  };
}

function nameOf(type: unknown): string {
  if (typeof type === "string") return `<${type}>`;
  if (typeof type === "function") return (type as { displayName?: string; name?: string }).displayName || type.name || "a component";
  return "a component";
}

export type RenderState = { ids: number };

export function newRenderState(): RenderState {
  return { ids: 0 };
}

/** Calls a server component with the server's hooks in place. Hooks only run before the first await. */
function call(type: (props: Record<string, unknown>) => unknown, props: Record<string, unknown>, render: RenderState) {
  const state = { ids: render.ids, component: nameOf(type) };
  const previous = internals.H;
  internals.H = dispatcher(state);
  try {
    return type(props);
  } finally {
    internals.H = previous;
    render.ids = state.ids;
  }
}

function fragment(key: string | null, children: WireValue): WireValue {
  return { $w: "e", t: "#f", k: key, p: { children } };
}

/** Encodes anything a server component may produce or pass to a client component. */
export async function encode(value: unknown, path: string, render: RenderState): Promise<WireValue> {
  const scalar = encodeScalar(value, path);
  if (scalar !== NOT_SCALAR) return scalar;
  if (isElement(value)) return encodeElement(value, path, render);
  if (Array.isArray(value)) {
    const out: WireValue[] = [];
    for (let i = 0; i < value.length; i++) out.push(await encode(value[i], `${path}[${i}]`, render));
    return out;
  }
  if (isThenable(value)) return encode(await value, path, render);
  if (typeof value === "function") {
    if (isClientReference(value)) return { $w: "c", id: value.$$id };
    const action = actionReference(value);
    if (action) {
      const bound: WireValue[] = [];
      for (let i = 0; i < action.bound.length; i++) bound.push(await encode(action.bound[i], `${path} bound ${i}`, render));
      return { $w: "a", id: action.id, b: bound };
    }
    throw new Error(`${path} is a function (${nameOf(value)}); only server actions and client components can be sent to the browser.`);
  }
  if (value instanceof Map) {
    const entries: WireValue[] = [];
    for (const [k, v] of value) entries.push([await encode(k, `${path} key`, render), await encode(v, `${path}.get(${String(k)})`, render)]);
    return { $w: "m", v: entries };
  }
  if (value instanceof Set) {
    const items: WireValue[] = [];
    for (const v of value) items.push(await encode(v, `${path} item`, render));
    return { $w: "s", v: items };
  }
  if (isPlainObject(value)) {
    const resolved: Record<string, WireValue> = {};
    for (const [k, v] of Object.entries(value)) resolved[k] = await encode(v, `${path}.${k}`, render);
    return encodeObject(resolved, path, (v) => v as WireValue);
  }
  throw new Error(`${path} is a ${Object.prototype.toString.call(value)}, which cannot be sent to the browser.`);
}

async function encodeProps(props: Record<string, unknown>, path: string, render: RenderState) {
  const out: { [key: string]: WireValue } = {};
  for (const [k, v] of Object.entries(props)) {
    if (k === "ref") {
      if (v != null) throw new Error(`${path} passes a ref, which cannot be sent to the browser.`);
      continue;
    }
    out[k] = await encode(v, k === "children" ? path : `${path} prop ${k}`, render);
  }
  return out;
}

async function encodeElement(el: AnyElement, path: string, render: RenderState): Promise<WireValue> {
  const { type, key, props } = el;
  if (typeof type === "string") {
    return { $w: "e", t: type, k: key, p: await encodeProps(props, `${path} > ${type}`, render) };
  }
  if (type === FRAGMENT || type === SUSPENSE || type === STRICT_MODE || type === PROFILER) {
    return fragment(key, await encode(props.children, path, render));
  }
  if (isClientReference(type)) {
    return { $w: "e", t: { c: type.$$id }, k: key, p: await encodeProps(props, `${path} > ${type.$$id}`, render) };
  }
  if (typeof type === "function") {
    if ((type as { prototype?: { isReactComponent?: unknown } }).prototype?.isReactComponent) {
      throw new Error(`${path} > ${nameOf(type)} is a class component; the server renders only function components.`);
    }
    let out = call(type as (p: Record<string, unknown>) => unknown, props, render);
    if (isThenable(out)) out = await out;
    const encoded = await encode(out, `${path} > ${nameOf(type)}`, render);
    return key !== null ? fragment(key, encoded) : encoded;
  }
  if (type && typeof type === "object") {
    const tag = (type as { $$typeof?: unknown }).$$typeof;
    if (tag === FORWARD_REF) {
      const renderFn = (type as { render: (p: Record<string, unknown>, ref: unknown) => unknown }).render;
      const { ref, ...rest } = props;
      const wrapped = (p: Record<string, unknown>) => renderFn(p, ref ?? null);
      Object.defineProperty(wrapped, "name", { value: nameOf(renderFn) });
      return encodeElement({ ...el, type: wrapped, props: rest }, path, render);
    }
    if (tag === MEMO) return encodeElement({ ...el, type: (type as { type: unknown }).type }, path, render);
    if (tag === CONTEXT) return fragment(key, await encode(props.children, path, render));
    if (tag === LAZY) {
      const lazy = type as { _payload: unknown; _init: (payload: unknown) => unknown };
      let resolved: unknown;
      try {
        resolved = lazy._init(lazy._payload);
      } catch (thrown) {
        if (isThenable(thrown)) {
          await thrown;
          resolved = lazy._init(lazy._payload);
        } else throw thrown;
      }
      return encodeElement({ ...el, type: resolved }, path, render);
    }
  }
  throw new Error(`${path} renders an element of an unknown type.`);
}
