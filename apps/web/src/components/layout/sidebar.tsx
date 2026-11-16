"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { PRODUCT_NAME, ProductMark } from "@/components/brand/product-logo";
import { AppIcons, type AppIcon } from "@/components/icons/app-icons";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { navGroups, utilityRoutes } from "@/config/routes";
import { useOrganization } from "@/features/organization/hooks";
import { useOrganizationSettingsNav } from "@/features/organization/hooks/use-organization-settings-nav";
import { useSupportUnreadCount } from "@/features/support/hooks";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";

/*
 * Motion notes (same recipe as pinroom):
 * - The sidebar keeps a fixed-width inner column and the outer <aside> animates
 *   its width, so collapsing clips + fades labels instead of reflowing them.
 * - One highlight glides between items, and it moves on click, before the
 *   route finishes loading.
 */

const EXPANDED_WIDTH = "w-60";
/** Highlight width on the 52px rail: the icon plus its padding. */
const COLLAPSED_HIGHLIGHT = 36;

function isActivePath(pathname: string, href: string, matchPrefix?: string) {
  const base = matchPrefix ?? href;
  return pathname === base || pathname.startsWith(`${base}/`);
}

/* ─── Organization brand (top) ────────────────────────────────────────────── */

function OrganizationBrand({ collapsed }: { collapsed: boolean }) {
  const { data: organization } = useOrganization();
  const name = organization?.name ?? "";

  return (
    <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-3">
      <div className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-sidebar-primary text-[13px] font-bold text-sidebar-primary-foreground">
        {organization?.logoUrl ? (
          // Signed storage URL; next/image would need the bucket host configured.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={organization.logoUrl}
            alt=""
            className="size-full bg-white object-contain"
          />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </div>
      <span
        className={cn(
          "truncate text-[15px] font-semibold tracking-tight text-sidebar-foreground transition-opacity duration-slow ease-smooth",
          collapsed && "opacity-0",
        )}
      >
        {name}
      </span>
    </div>
  );
}

/* ─── Gliding highlight ───────────────────────────────────────────────────── */

type Box = { top: number; left: number; width: number; height: number };

/**
 * Measures the item marked `data-nav={activeKey}` inside `container` and
 * returns its box; the caller renders one highlight that moves between boxes.
 * The first placement doesn't animate (no glide on page load).
 */
function useHighlight(
  container: React.RefObject<HTMLElement | null>,
  activeKey: string | null,
  deps: unknown[],
  /** Collapsed rail: shrink to the icon instead of being clipped. */
  maxWidth?: number,
) {
  const [box, setBox] = useState<Box | null>(null);
  const [glides, setGlides] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      const item = activeKey
        ? container.current?.querySelector<HTMLElement>(
            `[data-nav="${CSS.escape(activeKey)}"]`,
          )
        : null;
      const root = container.current;
      setBox((previous) => {
        if (!item || !root) return null;
        // Measure against the container itself, not offsetParent: items sit
        // inside positioned groups, so offsetTop would be group-relative.
        const itemRect = item.getBoundingClientRect();
        const rootRect = root.getBoundingClientRect();
        const next = {
          top: itemRect.top - rootRect.top,
          left: itemRect.left - rootRect.left,
          width: item.offsetWidth,
          height: item.offsetHeight,
        };
        return previous &&
          previous.top === next.top &&
          previous.left === next.left &&
          previous.width === next.width &&
          previous.height === next.height
          ? previous
          : next;
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller-provided deps
  }, [activeKey, ...deps]);

  useEffect(() => {
    if (box && !glides) {
      const frame = requestAnimationFrame(() => setGlides(true));
      return () => cancelAnimationFrame(frame);
    }
  }, [box, glides]);

  const highlight = box ? (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute left-0 top-0 rounded-md bg-sidebar-accent",
        glides &&
          "transition-[transform,height,width] duration-slow ease-smooth motion-reduce:transition-none",
      )}
      style={{
        transform: `translate(${box.left}px, ${box.top}px)`,
        width: maxWidth ? Math.min(box.width, maxWidth) : box.width,
        height: box.height,
      }}
    />
  ) : null;

  return highlight;
}

/**
 * What you clicked shows as current until the address catches up, so the
 * sidebar answers instantly even while the next page is still loading.
 */
function useOptimisticActive(actual: string | null) {
  const pathname = usePathname();
  const [picked, setPicked] = useState<{ key: string; from: string } | null>(
    null,
  );
  const shown = picked && picked.from === pathname ? picked.key : actual;
  const pick = (key: string) => setPicked({ key, from: pathname });
  return { shown, pick };
}

/* ─── Link ────────────────────────────────────────────────────────────────── */

function SidebarLink({
  href,
  navKey,
  label,
  icon: Icon,
  active,
  collapsed,
  badge,
  onNavigate,
}: {
  href: string;
  navKey: string;
  label: string;
  icon: AppIcon;
  active: boolean;
  collapsed: boolean;
  badge?: number;
  onNavigate?: () => void;
}) {
  const link = (
    <Link
      href={href}
      data-nav={navKey}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-md px-2.5 py-[9px] text-[13px] font-medium",
        "transition-colors duration-fast ease-enter",
        active
          ? "text-sidebar-foreground"
          : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
      )}
    >
      <Icon
        className={cn(
          "size-[18px] shrink-0 transition-colors duration-fast ease-enter",
          active
            ? "text-sidebar-primary"
            : "text-sidebar-foreground/45 group-hover:text-sidebar-foreground/75",
        )}
        stroke={active ? 2.25 : 1.75}
      />
      <span
        className={cn(
          "truncate leading-none transition-opacity duration-slow ease-smooth",
          collapsed && "opacity-0",
        )}
      >
        {label}
      </span>
      {badge ? (
        collapsed ? (
          <span className="absolute left-7 top-1.5 size-2 rounded-full bg-sidebar-primary" />
        ) : (
          <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-sidebar-primary px-1 text-[10px] font-bold leading-none text-sidebar-primary-foreground">
            {badge > 99 ? "99+" : badge}
          </span>
        )
      ) : null}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

/* ─── Main navigation ─────────────────────────────────────────────────────── */

function SidebarNav({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { canAccessRoute } = usePermissions();
  const container = useRef<HTMLDivElement>(null);

  const groups = navGroups
    .map((group) => ({ ...group, routes: group.routes.filter(canAccessRoute) }))
    .filter((group) => group.routes.length > 0);
  const actual =
    groups
      .flatMap((group) => group.routes)
      .find((route) => isActivePath(pathname, route.href))?.href ?? null;
  const { shown, pick } = useOptimisticActive(actual);
  const highlight = useHighlight(
    container,
    shown,
    [groups.length],
    collapsed ? COLLAPSED_HIGHLIGHT : undefined,
  );

  return (
    <nav
      aria-label="Main"
      className="scrollbar-none flex-1 overflow-y-auto overflow-x-hidden px-2 py-4"
    >
      <div ref={container} className="relative flex flex-col gap-5">
        {highlight}
        {groups.map((group) => (
          <div key={group.label} className="relative flex flex-col gap-0.5">
            <p
              className={cn(
                "mb-1 truncate px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-foreground/40 transition-opacity duration-slow ease-smooth",
                collapsed && "opacity-0",
              )}
            >
              {group.label}
            </p>
            {group.routes.map((route) => (
              <SidebarLink
                key={route.href}
                navKey={route.href}
                href={route.href}
                label={route.label}
                icon={route.icon}
                active={shown === route.href}
                collapsed={collapsed}
                onNavigate={() => {
                  pick(route.href);
                  onNavigate?.();
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </nav>
  );
}

/* ─── Footer: help, settings, collapse, product brand ─────────────────────── */

function SidebarFooter({
  collapsed,
  onNavigate,
  showCollapseToggle,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  showCollapseToggle: boolean;
}) {
  const pathname = usePathname();
  const { can, canAccessRoute } = usePermissions();
  const { firstHref: settingsHref } = useOrganizationSettingsNav();
  const { data: unreadSupport } = useSupportUnreadCount({
    enabled: can("support.read"),
  });
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const container = useRef<HTMLDivElement>(null);

  const entries: {
    key: string;
    href: string;
    label: string;
    icon: AppIcon;
    active: boolean;
    badge?: number;
  }[] = utilityRoutes.filter(canAccessRoute).map((route) => ({
    key: route.href,
    href: route.href,
    label: route.label,
    icon: route.icon,
    active: isActivePath(pathname, route.href),
    badge: route.href === "/support" ? unreadSupport : undefined,
  }));
  if (settingsHref) {
    entries.push({
      key: "settings",
      href: settingsHref,
      label: "Settings",
      icon: AppIcons.settings,
      active: isActivePath(pathname, settingsHref, "/settings"),
    });
  }

  const actual = entries.find((entry) => entry.active)?.key ?? null;
  const { shown, pick } = useOptimisticActive(actual);
  const highlight = useHighlight(
    container,
    shown,
    [entries.length],
    collapsed ? COLLAPSED_HIGHLIGHT : undefined,
  );

  const items: ReactNode[] = entries.map((entry) => (
    <SidebarLink
      key={entry.key}
      navKey={entry.key}
      href={entry.href}
      label={entry.label}
      icon={entry.icon}
      active={shown === entry.key}
      collapsed={collapsed}
      badge={entry.badge}
      onNavigate={() => {
        pick(entry.key);
        onNavigate?.();
      }}
    />
  ));

  return (
    <div className="shrink-0 border-t border-sidebar-border px-2 py-2">
      <div ref={container} className="relative flex flex-col gap-0.5">
        {highlight}
        {items}
      </div>

      <div className="mt-2 flex items-center gap-1.5 pt-1">
        {showCollapseToggle ? (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/50 transition-colors duration-fast ease-enter hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          >
            <AppIcons.sidebarCollapse
              className={cn(
                "size-4 transition-[rotate] duration-slow ease-smooth",
                collapsed && "rotate-180",
              )}
              stroke={2}
            />
          </button>
        ) : null}
        <span
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1.5 px-1 text-[11px] text-sidebar-foreground/45 transition-opacity duration-slow ease-smooth",
            collapsed && "opacity-0",
          )}
          title={`Powered by ${PRODUCT_NAME}`}
        >
          <ProductMark className="size-4" />
          <span className="truncate">Powered by {PRODUCT_NAME}</span>
        </span>
      </div>
    </div>
  );
}

/* ─── Desktop sidebar ─────────────────────────────────────────────────────── */

export function Sidebar() {
  const collapsed = useUIStore((state) => state.sidebarCollapsed);

  return (
    <aside
      className={cn(
        "hidden shrink-0 overflow-hidden border-r border-sidebar-border bg-sidebar md:block",
        "transition-[width] duration-gentle ease-smooth motion-reduce:transition-none",
        collapsed ? "w-[52px]" : EXPANDED_WIDTH,
      )}
    >
      {/* Fixed-width column: the aside clips it while animating. */}
      <div className={cn("flex h-full flex-col", EXPANDED_WIDTH)}>
        <OrganizationBrand collapsed={collapsed} />
        <SidebarNav collapsed={collapsed} />
        <SidebarFooter collapsed={collapsed} showCollapseToggle />
      </div>
    </aside>
  );
}

/* ─── Mobile sidebar (drawer) ─────────────────────────────────────────────── */

export function MobileSidebar() {
  const open = useUIStore((state) => state.mobileSidebarOpen);
  const closeMobileSidebar = useUIStore((state) => state.closeMobileSidebar);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) closeMobileSidebar();
      }}
    >
      <SheetContent
        side="left"
        className="w-64 gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <OrganizationBrand collapsed={false} />
        <SidebarNav collapsed={false} onNavigate={closeMobileSidebar} />
        <SidebarFooter
          collapsed={false}
          onNavigate={closeMobileSidebar}
          showCollapseToggle={false}
        />
      </SheetContent>
    </Sheet>
  );
}
