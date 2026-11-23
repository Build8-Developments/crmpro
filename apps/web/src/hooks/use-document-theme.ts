import { useSyncExternalStore } from "react";

export type DocumentTheme = "light" | "dark";

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

const getTheme = (): DocumentTheme =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

/** The theme currently applied to <html> (the `dark` class), kept in sync. */
export function useDocumentTheme(): DocumentTheme {
  return useSyncExternalStore(subscribe, getTheme, () => "light");
}
