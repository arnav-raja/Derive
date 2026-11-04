"use client";

import { useEffect, useRef, type ReactNode } from "react";

/*
 * Links each symbol to its other appearances: hovering or focusing an element
 * with data-sym (in prose, in an equation via \sym{id}{...}, or in a figure)
 * highlights every element in the lesson with the same data-sym.
 */

function symOf(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest("[data-sym]");
  return el?.getAttribute("data-sym") ?? null;
}

export function SymbolHighlighter({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let active: string | null = null;
    const set = (id: string | null) => {
      if (id === active) return;
      if (active) {
        for (const n of el.querySelectorAll(`[data-sym="${CSS.escape(active)}"]`)) n.classList.remove("sym-active");
      }
      active = id;
      if (id) {
        for (const n of el.querySelectorAll(`[data-sym="${CSS.escape(id)}"]`)) n.classList.add("sym-active");
      }
    };
    const over = (e: Event) => set(symOf(e.target));
    const out = (e: Event) => {
      const next = e instanceof FocusEvent || e instanceof PointerEvent ? symOf(e.relatedTarget) : null;
      set(next);
    };
    el.addEventListener("pointerover", over);
    el.addEventListener("pointerout", out);
    el.addEventListener("focusin", over);
    el.addEventListener("focusout", out);
    return () => {
      el.removeEventListener("pointerover", over);
      el.removeEventListener("pointerout", out);
      el.removeEventListener("focusin", over);
      el.removeEventListener("focusout", out);
    };
  }, []);

  return <div ref={root}>{children}</div>;
}
