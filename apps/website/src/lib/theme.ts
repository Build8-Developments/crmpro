/** Website theme: the visitor's choice, saved in localStorage; "system" follows the OS. */
export const THEME_STORAGE_KEY = "nomow-theme";
export const THEME_MODES = ["system", "light", "dark"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export function readThemeMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

const CHANGE_EVENT = "nomow-theme-change";

/** For useSyncExternalStore: re-read the mode whenever it is changed on this page. */
export function subscribeThemeMode(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

/** Applies a mode to <html> (the `dark` class drives every colour token) and saves it. */
export function applyThemeMode(mode: ThemeMode) {
  const dark =
    mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  try {
    if (mode === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Private mode or blocked storage: the choice lasts for this page only.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
