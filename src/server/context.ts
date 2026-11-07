import { AsyncLocalStorage } from "node:async_hooks";

/*
 * What the server knows about the request it is answering: the learner's
 * access token, and what the request's work asked for along the way (a
 * refreshed page, work to finish after the answer). Held in an
 * AsyncLocalStorage, so code deep in a page can reach it, as Next.js code
 * reaches cookies() and headers().
 */

export type RequestContext = {
  /** The Supabase access token from the Authorization header, if any. */
  token: string | null;
  /** Set by refresh() and revalidatePath(): the page should be rendered again. */
  refresh: boolean;
  /** Work to finish after the response, such as the notebook written after a phase. */
  waitUntil: (work: Promise<unknown>) => void;
  /** Per-request memo, for the session and the store. */
  memo: Map<string, Promise<unknown>>;
};

const storage = new AsyncLocalStorage<RequestContext>();

export function runInRequest<T>(context: Omit<RequestContext, "refresh" | "memo">, work: () => Promise<T>): Promise<T> {
  return storage.run({ ...context, refresh: false, memo: new Map() }, work);
}

export function currentRequest(): RequestContext {
  const context = storage.getStore();
  if (!context) throw new Error("This needs a request, and there is none: it ran outside the server's handler.");
  return context;
}

/** A value computed once per request. */
export function perRequest<T>(key: string, make: () => Promise<T>): Promise<T> {
  const memo = currentRequest().memo;
  let hit = memo.get(key) as Promise<T> | undefined;
  if (!hit) {
    hit = make();
    memo.set(key, hit);
  }
  return hit;
}

/** Signals thrown by redirect() and notFound(), caught by the handler. */
export class RedirectSignal extends Error {
  constructor(readonly to: string) {
    super(`Redirect to ${to}`);
    this.name = "RedirectSignal";
  }
}

export class NotFoundSignal extends Error {
  constructor() {
    super("Not found");
    this.name = "NotFoundSignal";
  }
}
