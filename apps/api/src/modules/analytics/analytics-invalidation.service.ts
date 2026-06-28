import { Injectable } from '@nestjs/common';
import { CacheService } from '../../common/cache/cache.service';

@Injectable()
export class AnalyticsInvalidationService {
  constructor(private readonly cacheService: CacheService) {}

  async invalidateTenant(tenantId: string): Promise<void> {
    await this.cacheService.invalidateTenantAnalytics(tenantId);
  }
}
