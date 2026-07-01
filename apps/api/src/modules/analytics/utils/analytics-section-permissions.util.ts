import { PERMISSIONS, type PermissionKey } from '@crmpro/shared/auth';

export type AnalyticsDashboardSection =
  | 'overview'
  | 'pipeline'
  | 'trends'
  | 'team'
  | 'activity'
  | 'sources'
  | 'projects'
  | 'developers'
  | 'status';

export interface AnalyticsSectionVisibility {
  overview: boolean;
  pipeline: boolean;
  trends: boolean;
  team: boolean;
  activity: boolean;
  sources: boolean;
  projects: boolean;
  developers: boolean;
  status: boolean;
}

export function getVisibleDashboardSections(
  permissions: Set<PermissionKey>,
): AnalyticsSectionVisibility {
  const canReadAnalytics = permissions.has(PERMISSIONS.ANALYTICS_READ);

  return {
    overview: canReadAnalytics,
    pipeline: permissions.has(PERMISSIONS.PIPELINE_READ),
    trends: canReadAnalytics,
    team: permissions.has(PERMISSIONS.USER_READ),
    activity:
      permissions.has(PERMISSIONS.AUDIT_READ) ||
      permissions.has(PERMISSIONS.LEAD_READ),
    sources: canReadAnalytics,
    projects: canReadAnalytics,
    developers: canReadAnalytics,
    status: canReadAnalytics,
  };
}

export function canViewActivitySection(
  permissions: Set<PermissionKey>,
): boolean {
  return getVisibleDashboardSections(permissions).activity;
}

export function getRequiredPermissionForSection(
  section: AnalyticsDashboardSection,
): PermissionKey | null {
  switch (section) {
    case 'overview':
    case 'trends':
    case 'sources':
    case 'projects':
    case 'developers':
    case 'status':
      return PERMISSIONS.ANALYTICS_READ;
    case 'pipeline':
      return PERMISSIONS.PIPELINE_READ;
    case 'team':
      return PERMISSIONS.USER_READ;
    case 'activity':
      return null;
    default:
      return null;
  }
}
