import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  readStoredTheme,
  resolveTheme,
  writeStoredTheme,
  applyResolvedTheme,
} from "./themeStorage.js";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => readStoredTheme());
  const [systemVersion, setSystemVersion] = useState(0);

  const resolvedTheme = useMemo(() => resolveTheme(theme), [theme, systemVersion]);

  useEffect(() => {
    applyResolvedTheme(resolvedTheme);
    writeStoredTheme(theme);
  }, [theme, resolvedTheme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemVersion((v) => v + 1);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((mode) => {
    setThemeState(mode);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
    }),
    [theme, setTheme, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}

/** Safe outside provider (e.g. charts): reads class on document. */
export function useResolvedThemeClass() {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx.resolvedTheme;
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}
