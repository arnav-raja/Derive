import { NotFoundSignal, RedirectSignal } from "@/server/context";

/*
 * next/navigation as server code sees it on Derive's server. redirect() and
 * notFound() throw signals that the handler turns into answers for the
 * browser. The hooks belong to client components, which never run here.
 */

export function redirect(to: string): never {
  throw new RedirectSignal(to);
}

export function permanentRedirect(to: string): never {
  throw new RedirectSignal(to);
}

export function notFound(): never {
  throw new NotFoundSignal();
}

export const RedirectType = { push: "push", replace: "replace" } as const;
