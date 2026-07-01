import type { ComponentType } from "react";
import type { IconProps } from "@tabler/icons-react";
import {
  IconLayoutDashboard,
  IconUsers,
  IconLayoutKanban,
  IconBuildingSkyscraper,
  IconBuildingCommunity,
  IconTag,
  IconUsersGroup,
  IconShieldLock,
  IconFileImport,
  IconFileExport,
  IconFiles,
  IconHistory,
  IconBell,
  IconSettings,
  IconSearch,
  IconPlus,
  IconChevronDown,
  IconChevronRight,
  IconMenu2,
  IconX,
  IconLogout,
  IconUser,
  IconUserCircle,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconSun,
  IconMoonStars,
} from "@tabler/icons-react";

/**
 * Icon abstraction layer.
 *
 * All Tabler icons must be referenced through `AppIcons` so the icon set can be
 * swapped or renamed in one place. Never import icons directly in feature code.
 */
export type AppIcon = ComponentType<IconProps>;

export const AppIcons = {
  // Navigation
  dashboard: IconLayoutDashboard,
  leads: IconUsers,
  pipelines: IconLayoutKanban,
  developers: IconBuildingSkyscraper,
  projects: IconBuildingCommunity,
  leadSources: IconTag,
  users: IconUsersGroup,
  roles: IconShieldLock,
  imports: IconFileImport,
  exports: IconFileExport,
  files: IconFiles,
  audit: IconHistory,
  notifications: IconBell,
  settings: IconSettings,

  // Actions / chrome
  search: IconSearch,
  create: IconPlus,
  chevronDown: IconChevronDown,
  chevronRight: IconChevronRight,
  menu: IconMenu2,
  close: IconX,
  logout: IconLogout,
  user: IconUser,
  profile: IconUserCircle,
  sidebarCollapse: IconLayoutSidebarLeftCollapse,
  sidebarExpand: IconLayoutSidebarLeftExpand,
  lightMode: IconSun,
  darkMode: IconMoonStars,
} satisfies Record<string, AppIcon>;

export type AppIconName = keyof typeof AppIcons;
