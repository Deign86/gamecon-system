import { createContext, useContext, useEffect, useState, useCallback } from "react";

const ThemeCtx = createContext({ mode: "system", effective: "dark", setTheme: () => {} });

const STORAGE_KEY = "gc-theme-pref";

/**
 * Resolves the user's preference ("system" | "light" | "dark") into an
 * effective theme by checking the OS media query when needed.
 */
function resolve(pref) {
  if (pref === "system") {
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }
  return pref;
}

/** Apply the resolved theme to <html> and update the theme-color meta tag. */
function applyToDOM(eff) {
  const html = document.documentElement;
  html.classList.remove("light", "dark");
  html.classList.add(eff);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = eff === "light" ? "#F9F7F5" : "#080808";
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "system";
    } catch {
      return "system";
    }
  });

  const [effective, setEffective] = useState(() => resolve(mode));

  /* Whenever mode changes, apply and optionally listen for OS changes. */
  useEffect(() => {
    const eff = resolve(mode);
    applyToDOM(eff);
    setEffective(eff);

    if (mode === "system") {
      const mql = window.matchMedia("(prefers-color-scheme: light)");
      const onChange = (e) => {
        const next = e.matches ? "light" : "dark";
        applyToDOM(next);
        setEffective(next);
      };
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
  }, [mode]);

  const setTheme = useCallback((next) => {
    setMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable — theme still works in-session */
    }
  }, []);

  return (
    <ThemeCtx.Provider value={{ mode, effective, setTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
