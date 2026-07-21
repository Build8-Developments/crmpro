import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ADMIN_PERMISSIONS } from '@crmpro/shared';
import {
  AdminPermissionsGuard,
  RequireAdminPermission,
} from '../../common/auth';
import { CurrentAdmin } from '../auth/decorators/current-admin.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedAdmin } from '../auth/auth.types';
import {
  CreateAdminSupportMessageDto,
  GetAdminSupportConversationsQueryDto,
  UpdateAdminSupportStatusDto,
} from './dto/support.dto';
import { AdminSupportService } from './support.service';

@Controller('support')
@UseGuards(JwtAuthGuard, AdminPermissionsGuard)
export class AdminSupportController {
  constructor(private readonly supportService: AdminSupportService) {}

  @Get('summary')
  @RequireAdminPermission(ADMIN_PERMISSIONS.SUPPORT_ACCESS)
  async summary() {
    const data = await this.supportService.getInboxSummary();
    return { success: true, data };
  }

  @Get('conversations')
  @RequireAdminPermission(ADMIN_PERMISSIONS.SUPPORT_ACCESS)
  async list(@Query() query: GetAdminSupportConversationsQueryDto) {
    const data = await this.supportService.listConversations(query);
    return { success: true, data };
  }

  @Get('conversations/:id')
  @RequireAdminPermission(ADMIN_PERMISSIONS.SUPPORT_ACCESS)
  async get(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.supportService.getConversation(id);
    return { success: true, data };
  }

  @Post('conversations/:id/messages')
  @RequireAdminPermission(ADMIN_PERMISSIONS.SUPPORT_ACCESS)
  async reply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAdminSupportMessageDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    const data = await this.supportService.reply(id, admin.id, dto);
    return { success: true, data };
  }

  @Patch('conversations/:id/status')
  @RequireAdminPermission(ADMIN_PERMISSIONS.SUPPORT_ACCESS)
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminSupportStatusDto,
  ) {
    const data = await this.supportService.updateStatus(id, dto);
    return { success: true, data };
  }
}
