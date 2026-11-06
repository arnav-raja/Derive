"use client";

import { useEffect } from "react";

/*
 * A box that scrolls sideways, such as a long line of code, wide maths or a table on a phone, is
 * scrolled from the keyboard with the arrow keys once it has focus. A box that holds nothing
 * focusable can get focus only if it is a tab stop, so each such box is made one, but only while
 * its content does not fit, by even a pixel: a box that fits adds no stop. Boxes are looked at
 * again when the window is resized, when fonts arrive and when the page changes, such as a Reveal
 * opening. Mounted once, in the root layout.
 */

const BOXES = "pre, .katex-display, .table-scroll, .overflow-x-auto, .overflow-x-scroll";
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex^="-"])',
].join(", ");
/** Marks the stops made here, so that only those are ever taken away again. */
const MARK = "data-scroll-stop";

/** Whether the box can be scrolled at all, even by a pixel, as the browser and axe both see it. */
function scrolls(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  const can = (overflow: string) => overflow === "auto" || overflow === "scroll";
  return (can(style.overflowX) && el.scrollWidth > el.clientWidth) || (can(style.overflowY) && el.scrollHeight > el.clientHeight);
}

export function updateScrollStops(root: ParentNode = document): void {
  for (const el of root.querySelectorAll<HTMLElement>(BOXES)) {
    const ours = el.hasAttribute(MARK);
    if (!ours && el.hasAttribute("tabindex")) continue;
    const needed = scrolls(el) && !el.querySelector(`:is(${FOCUSABLE}):not([${MARK}])`);
    if (needed && !ours) {
      el.setAttribute("tabindex", "0");
      el.setAttribute(MARK, "");
    } else if (!needed && ours) {
      el.removeAttribute("tabindex");
      el.removeAttribute(MARK);
    }
  }
}

export function ScrollStops() {
  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        updateScrollStops();
      });
    };
    schedule();
    void document.fonts?.ready.then(schedule);
    window.addEventListener("resize", schedule);
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, []);
  return null;
}
