import { create } from "zustand";

export interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbState {
  /** Extra crumbs a page appends below its route (e.g. a folder path). */
  trail: Crumb[];
  setTrail: (trail: Crumb[]) => void;
}

export const useBreadcrumbStore = create<BreadcrumbState>((set) => ({
  trail: [],
  setTrail: (trail) => set({ trail }),
}));
