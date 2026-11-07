import { currentRequest } from "@/server/context";

/*
 * next/server on Derive's server: after() runs its work once the answer is
 * sent, and connection() has nothing to wait for, since every request is
 * rendered for the learner who made it.
 */

export function after(work: (() => unknown) | Promise<unknown>): void {
  const run = typeof work === "function" ? Promise.resolve().then(work) : work;
  currentRequest().waitUntil(
    run.then(
      () => undefined,
      (error) => console.error("after() failed:", error),
    ),
  );
}

export async function connection(): Promise<void> {}
