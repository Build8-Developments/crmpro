import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { PermissionsGuard, RequirePermission } from '../../common/auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { AuditService } from './audit.service';
import { GetAuditQueryDto } from './dto/get-audit-query.dto';

@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermission(PERMISSIONS.AUDIT_READ)
  async listAuditLogs(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetAuditQueryDto,
  ) {
    const data = await this.auditService.listAuditLogs(user.tenantId, query);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.AUDIT_READ)
  async getAuditLog(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.auditService.getAuditLog(user.tenantId, id);
    return { success: true, data };
  }
}
