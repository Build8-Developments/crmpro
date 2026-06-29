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
import { GetSecurityEventsQueryDto } from './dto/get-security-events-query.dto';
import { SecurityEventsService } from './security-events.service';

@Controller('security-events')
@UseGuards(JwtAuthGuard, AdminPermissionsGuard)
export class SecurityEventsController {
  constructor(private readonly securityEventsService: SecurityEventsService) {}

  @Get()
  @RequireAdminPermission(ADMIN_PERMISSIONS.AUDIT_READ)
  async listSecurityEvents(@Query() query: GetSecurityEventsQueryDto) {
    const data = await this.securityEventsService.listSecurityEvents(query);
    return { success: true, data };
  }

  @Get(':id')
  @RequireAdminPermission(ADMIN_PERMISSIONS.AUDIT_READ)
  async getSecurityEvent(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.securityEventsService.getSecurityEvent(id);
    return { success: true, data };
  }
}
