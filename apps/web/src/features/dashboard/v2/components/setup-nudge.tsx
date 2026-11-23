import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";

/**
 * A one-line prompt at the top of a dashboard section when this month's
 * input (targets, marketing spend) hasn't been entered yet, with a link to
 * the page where it's done. Callers show it only to people who can fix it.
 */
export function SetupNudge({ message, href, action }: { message: string; href: string; action: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs">
      <AppIcons.alertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
      <span className="min-w-0 flex-1 text-foreground">{message}</span>
      <Link href={href} className="font-medium text-primary hover:underline">
        {action}
      </Link>
    </div>
  );
}
