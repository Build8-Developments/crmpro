import type { ReactNode } from "react";
import { ProtectedLayoutClient } from "./protected-layout-client";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return <ProtectedLayoutClient>{children}</ProtectedLayoutClient>;
}
