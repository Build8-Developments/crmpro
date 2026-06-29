import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ADMIN_PERMISSIONS } from '@crmpro/shared';
import {
  AdminPermissionsGuard,
  RequireAdminPermission,
} from '../../common/auth';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditService } from './audit.service';
import { GetAuditQueryDto } from './dto/get-audit-query.dto';

@Controller('audit')
@UseGuards(JwtAuthGuard, AdminPermissionsGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequireAdminPermission(ADMIN_PERMISSIONS.AUDIT_READ)
  async listAuditLogs(@Query() query: GetAuditQueryDto) {
    const data = await this.auditService.listAuditLogs(query);
    return { success: true, data };
  }

  @Get(':id')
  @RequireAdminPermission(ADMIN_PERMISSIONS.AUDIT_READ)
  async getAuditLog(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.auditService.getAuditLog(id);
    return { success: true, data };
  }
}
