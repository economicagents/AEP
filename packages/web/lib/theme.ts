export type ThemePreference = "auto" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "aep-theme";

export function getThemeFromTime(): ResolvedTheme {
  const hour = new Date().getHours();
  return hour >= 7 && hour < 19 ? "light" : "dark";
}

export function getMsUntilNextChange(): number {
  const now = new Date();
  const hour = now.getHours();
  const nextChange = new Date(now);

  if (hour >= 7 && hour < 19) {
    nextChange.setHours(19, 0, 0, 0);
  } else {
    if (hour >= 19) {
      nextChange.setDate(nextChange.getDate() + 1);
    }
    nextChange.setHours(7, 0, 0, 0);
  }

  return nextChange.getTime() - now.getTime();
}

export function loadThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "auto";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "auto") {
    return stored;
  }
  return "auto";
}

export function saveThemePreference(pref: ThemePreference): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, pref);
}
