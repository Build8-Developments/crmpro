import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  AdminPermissionsGuard,
  RequireAnyAdminPermission,
} from '../../common/auth';
import { ADMIN_PERMISSIONS } from '@crmpro/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchService } from './search.service';

@Controller('search')
@UseGuards(JwtAuthGuard, AdminPermissionsGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @RequireAnyAdminPermission(
    ADMIN_PERMISSIONS.TENANT_READ,
    ADMIN_PERMISSIONS.PLAN_READ,
    ADMIN_PERMISSIONS.CONTRACT_READ,
    ADMIN_PERMISSIONS.ADMIN_MANAGE,
    ADMIN_PERMISSIONS.AUDIT_READ,
    ADMIN_PERMISSIONS.SUPPORT_ACCESS,
  )
  async search(@Query() query: SearchQueryDto) {
    const data = await this.searchService.search(query.q, query.limit ?? 8);
    return { success: true, data };
  }
}
