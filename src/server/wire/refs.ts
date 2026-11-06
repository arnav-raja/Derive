/*
 * References that stand in for client components and server actions when the
 * server renders a page. The build replaces every "use client" module with one
 * whose exports are client references, and tags every export of a "use server"
 * module as an action (see scripts/build-api.mjs).
 */

export const CLIENT_REFERENCE = Symbol.for("derive.client-reference");

export type ClientReference = ((...args: unknown[]) => never) & { $$typeof: symbol; $$id: string };

const FUNCTION_KEYS = new Set(["apply", "call", "bind", "toString", "length", "name", "prototype", "caller", "arguments"]);

/**
 * A client component, by id ("<module>#<export>"). Reading a property gives a
 * reference to that property, as in <Tabs.List>, the way Next.js does.
 */
export function clientReference(id: string): ClientReference {
  const target = function clientReferenceStub() {
    throw new Error(`${id} is a client component or value; it cannot be called on the server.`);
  };
  const children = new Map<string, ClientReference>();
  return new Proxy(target, {
    get(t, prop, receiver) {
      if (prop === "$$typeof") return CLIENT_REFERENCE;
      if (prop === "$$id") return id;
      if (prop === "then") return undefined;
      if (typeof prop === "symbol" || FUNCTION_KEYS.has(prop)) return Reflect.get(t, prop, receiver);
      let child = children.get(prop);
      if (!child) {
        child = clientReference(`${id}.${prop}`);
        children.set(prop, child);
      }
      return child;
    },
  }) as unknown as ClientReference;
}

export function isClientReference(value: unknown): value is ClientReference {
  return typeof value === "function" && (value as { $$typeof?: unknown }).$$typeof === CLIENT_REFERENCE;
}

// Server actions --------------------------------------------------------------

type ActionFn = ((...args: unknown[]) => unknown) & { $$action?: string; $$bound?: unknown[] };

const actions = new Map<string, ActionFn>();

function bindAction(this: ActionFn, thisArg: unknown, ...args: unknown[]): ActionFn {
  const bound = Function.prototype.bind.call(this, thisArg, ...args) as ActionFn;
  bound.$$action = this.$$action;
  bound.$$bound = [...(this.$$bound ?? []), ...args];
  bound.bind = bindAction as typeof bound.bind;
  return bound;
}

/** Tags an exported server action with its id, so it can travel to the browser as a reference. */
export function registerAction(fn: unknown, id: string): void {
  if (typeof fn !== "function") return;
  const action = fn as ActionFn;
  action.$$action = id;
  action.$$bound = [];
  action.bind = bindAction as typeof action.bind;
  actions.set(id, action);
}

export function actionReference(value: unknown): { id: string; bound: unknown[] } | null {
  if (typeof value !== "function") return null;
  const id = (value as ActionFn).$$action;
  return id ? { id, bound: (value as ActionFn).$$bound ?? [] } : null;
}

export function findAction(id: string): ActionFn | null {
  return actions.get(id) ?? null;
}

export function actionIds(): string[] {
  return [...actions.keys()].sort();
}
