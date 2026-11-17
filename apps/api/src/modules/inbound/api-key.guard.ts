import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PLAN_FEATURES } from '../../common/entitlements/entitlement.constants';
import { PlanEntitlementService } from '../../common/entitlements/plan-entitlement.service';
import { TenantAccessService } from '../../common/tenant-access/tenant-access.service';
import { ApiKeysService } from '../api-keys/api-keys.service';

export interface ApiKeyRequest extends Request {
  apiKey?: { id: string; tenantId: string };
}

/**
 * Authenticates inbound integrations by `X-Api-Key` (or `Authorization:
 * Bearer crm_live_…`). The tenant must be accessible and on a plan with API
 * access — the same gates a signed-in user would pass.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly apiKeys: ApiKeysService,
    private readonly tenantAccess: TenantAccessService,
    private readonly entitlements: PlanEntitlementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ApiKeyRequest>();
    const header = request.headers['x-api-key'];
    const bearer = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    const rawKey = (Array.isArray(header) ? header[0] : header) ?? bearer;

    if (!rawKey) {
      throw new UnauthorizedException('Missing API key');
    }

    const key = await this.apiKeys.authenticate(rawKey.trim());

    if (!key) {
      throw new UnauthorizedException('Invalid API key');
    }

    try {
      await this.tenantAccess.assertTenantAccessible(key.tenantId);
    } catch {
      throw new ForbiddenException('Workspace is not active');
    }

    await this.entitlements.assertFeatureEnabled(
      key.tenantId,
      PLAN_FEATURES.API_ACCESS,
    );

    request.apiKey = key;
    return true;
  }
}
