"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getThemeFromTime,
  getMsUntilNextChange,
  loadThemePreference,
  saveThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (pref: ThemePreference) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeToDOM(theme: ResolvedTheme) {
  document.documentElement.setAttribute("data-theme", theme);
}

function resolveTheme(pref: ThemePreference): ResolvedTheme {
  return pref === "light" || pref === "dark" ? pref : getThemeFromTime();
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Static initial state so server and client match (avoids hydration mismatch).
  // localStorage is read in useEffect after mount.
  const [preference, setPreferenceState] = useState<ThemePreference>("auto");
  const [resolved, setResolved] = useState<ResolvedTheme>("light");

  const applyPreference = useCallback((pref: ThemePreference) => {
    const theme = resolveTheme(pref);
    setResolved(theme);
    applyThemeToDOM(theme);
  }, []);

  const setPreference = useCallback(
    (pref: ThemePreference) => {
      setPreferenceState(pref);
      saveThemePreference(pref);
      applyPreference(pref);
    },
    [applyPreference]
  );

  const toggleTheme = useCallback(() => {
    const next: ThemePreference = resolved === "light" ? "dark" : "light";
    setPreferenceState(next);
    saveThemePreference(next);
    applyPreference(next);
  }, [resolved, applyPreference]);

  // Sync with localStorage (external store) and cross-tab changes
  useEffect(() => {
    const sync = () => {
      const pref = loadThemePreference();
      setPreferenceState(pref);
      applyPreference(pref);
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [applyPreference]);

  // Time-based switching when preference is "auto" (sync with clock)
  useEffect(() => {
    if (preference !== "auto") return;

    const updateTheme = () => {
      const theme = getThemeFromTime();
      setResolved(theme);
      applyThemeToDOM(theme);
    };

    const msUntilChange = getMsUntilNextChange();
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const timeoutId = setTimeout(() => {
      updateTheme();
      intervalId = setInterval(updateTheme, 60000);
    }, msUntilChange);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [preference]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolved,
      setPreference,
      toggleTheme,
    }),
    [preference, resolved, setPreference, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
