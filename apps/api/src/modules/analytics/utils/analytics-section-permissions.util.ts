import { PERMISSIONS, type PermissionKey } from '@crmpro/shared/auth';

export type AnalyticsDashboardSection =
  | 'overview'
  | 'pipeline'
  | 'trends'
  | 'team'
  | 'activity';

export interface AnalyticsSectionVisibility {
  overview: boolean;
  pipeline: boolean;
  trends: boolean;
  team: boolean;
  activity: boolean;
}

export function getVisibleDashboardSections(
  permissions: Set<PermissionKey>,
): AnalyticsSectionVisibility {
  return {
    overview: permissions.has(PERMISSIONS.ANALYTICS_READ),
    pipeline: permissions.has(PERMISSIONS.PIPELINE_READ),
    trends: permissions.has(PERMISSIONS.ANALYTICS_READ),
    team: permissions.has(PERMISSIONS.USER_READ),
    activity:
      permissions.has(PERMISSIONS.AUDIT_READ) ||
      permissions.has(PERMISSIONS.LEAD_READ),
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
