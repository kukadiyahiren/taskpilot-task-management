/** @type {'light' | 'dark' | 'system'} */
export const THEME_MODES = ["light", "dark", "system"];

export const THEME_STORAGE_KEY = "taskpilot-theme";

/** @returns {'light' | 'dark' | 'system'} */
export function readStoredTheme() {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* ignore */
  }
  return "system";
}

/** @param {'light' | 'dark' | 'system'} mode */
export function writeStoredTheme(mode) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

/** @param {'light' | 'dark' | 'system'} mode @returns {'light' | 'dark'} */
export function resolveTheme(mode) {
  if (mode === "light" || mode === "dark") return mode;
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Apply class + color-scheme on documentElement (no localStorage write). */
export function applyResolvedTheme(resolved) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved === "dark" ? "dark" : "light";
}
