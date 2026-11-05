import { useSyncExternalStore } from "react";

import type { ThemePreference } from "@/lib/store/types";

/*
 * The theme is chosen in the browser: light, dark, or whatever this device
 * prefers. The choice is kept in local storage and applied to the root
 * element; every control that shows it reads the same store, so the account
 * menu and Settings always agree.
 */

const KEY = "derive-theme";
const listeners = new Set<() => void>();
let memory: ThemePreference | null = null;

export function readTheme(): ThemePreference {
  if (memory) return memory;
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  memory = theme;
  try {
    if (theme === "system") {
      localStorage.removeItem(KEY);
    } else {
      localStorage.setItem(KEY, theme);
    }
  } catch {
    // Storage may be unavailable; the choice then lasts for this page only.
  }
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/** The saved theme, which is only known in the browser. */
export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, readTheme, () => "system" as ThemePreference);
}
