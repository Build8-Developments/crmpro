/** Theme preference stored per browser. "system" follows the OS setting. */
export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "crmpro-theme";

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

function resolve(preference: ThemePreference): "light" | "dark" {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Applies and persists a theme with a short cross-fade (see globals.css). */
export function applyThemePreference(preference: ThemePreference): void {
  const root = document.documentElement;
  const theme = resolve(preference);

  root.classList.add("theme-transition");
  // Force the transition class to apply before the color variables swap.
  void root.offsetWidth;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  window.setTimeout(() => root.classList.remove("theme-transition"), 280);

  try {
    if (preference === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage unavailable (private mode): the choice lasts for this page only.
  }
}
