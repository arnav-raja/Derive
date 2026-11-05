"use client";

import { useCallback, useSyncExternalStore } from "react";

/*
 * A small on-or-off preference kept in this browser, such as whether a side
 * panel is open. It is read through an external store, so the server render
 * (which uses the fallback) and the stored choice never disagree during
 * hydration, and every component using the same key stays in step.
 */

const listeners = new Map<string, Set<() => void>>();
const memory = new Map<string, boolean>();

function read(key: string, fallback: boolean): boolean {
  const known = memory.get(key);
  if (known !== undefined) return known;
  try {
    const v = window.localStorage.getItem(key);
    return v === null ? fallback : v === "1";
  } catch {
    return fallback;
  }
}

export function usePreference(key: string, fallback: boolean): [boolean, (value: boolean) => void] {
  const subscribe = useCallback(
    (cb: () => void) => {
      const set = listeners.get(key) ?? new Set();
      set.add(cb);
      listeners.set(key, set);
      window.addEventListener("storage", cb);
      return () => {
        set.delete(cb);
        window.removeEventListener("storage", cb);
      };
    },
    [key],
  );
  const value = useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => fallback,
  );
  const set = useCallback(
    (v: boolean) => {
      memory.set(key, v);
      try {
        window.localStorage.setItem(key, v ? "1" : "0");
      } catch {
        // A preference only; private windows may refuse storage.
      }
      for (const l of listeners.get(key) ?? []) l();
    },
    [key],
  );
  return [value, set];
}

export function useMedia(query: string, serverValue: boolean): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}
