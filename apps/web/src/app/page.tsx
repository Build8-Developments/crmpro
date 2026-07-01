import { redirect } from "next/navigation";

/**
 * Root entry — send users into the protected app shell.
 * Unauthenticated visitors are redirected to /login by the protected layout.
 */
export default function RootPage() {
  redirect("/dashboard");
}
