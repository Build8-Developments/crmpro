import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ADMIN_PERMISSIONS } from '@crmpro/shared';
import type { Request } from 'express';
import {
  AdminPermissionsGuard,
  RequireAdminPermission,
  RequireAnyAdminPermission,
} from '../../common/auth';
import { toListResponseData } from '../../common/http/list-response';
import { CurrentAdmin } from '../auth/decorators/current-admin.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedAdmin } from '../auth/auth.types';
import { extractRequestSecurityMetadata } from '../auth/utils/request-metadata.util';
import { AdminsService } from './admins.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { GetAdminsQueryDto } from './dto/get-admins-query.dto';
import { ResetAdminPasswordDto } from './dto/reset-admin-password.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Controller('admins')
@UseGuards(JwtAuthGuard, AdminPermissionsGuard)
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Get('roles')
  @RequireAnyAdminPermission(
    ADMIN_PERMISSIONS.ADMIN_MANAGE,
    ADMIN_PERMISSIONS.AUDIT_READ,
  )
  async listRoles() {
    const roles = await this.adminsService.listRoles();
    return { success: true, data: toListResponseData(roles).items };
  }

  @Get('roles/:id')
  @RequireAnyAdminPermission(
    ADMIN_PERMISSIONS.ADMIN_MANAGE,
    ADMIN_PERMISSIONS.AUDIT_READ,
  )
  async getRole(@Param('id', ParseUUIDPipe) id: string) {
    const role = await this.adminsService.getRoleById(id);
    return { success: true, data: role };
  }

  @Get()
  @RequireAnyAdminPermission(
    ADMIN_PERMISSIONS.ADMIN_MANAGE,
    ADMIN_PERMISSIONS.AUDIT_READ,
  )
  async listAdmins(@Query() query: GetAdminsQueryDto) {
    const data = await this.adminsService.listAdmins(query);
    return { success: true, data };
  }

  @Get(':id')
  @RequireAnyAdminPermission(
    ADMIN_PERMISSIONS.ADMIN_MANAGE,
    ADMIN_PERMISSIONS.AUDIT_READ,
  )
  async getAdmin(@Param('id', ParseUUIDPipe) id: string) {
    const admin = await this.adminsService.getAdminById(id);
    return { success: true, data: admin };
  }

  @Post()
  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_MANAGE)
  async createAdmin(
    @Body() dto: CreateAdminDto,
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Req() req: Request,
  ) {
    const admin = await this.adminsService.createAdmin(
      dto,
      actor.id,
      extractRequestSecurityMetadata(req),
    );
    return { success: true, data: admin };
  }

  @Patch(':id')
  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_MANAGE)
  async updateAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminDto,
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Req() req: Request,
  ) {
    const admin = await this.adminsService.updateAdmin(
      id,
      dto,
      actor.id,
      extractRequestSecurityMetadata(req),
    );
    return { success: true, data: admin };
  }

  @Post(':id/deactivate')
  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_MANAGE)
  async deactivateAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Req() req: Request,
  ) {
    const admin = await this.adminsService.deactivateAdmin(
      id,
      actor.id,
      extractRequestSecurityMetadata(req),
    );
    return { success: true, data: admin };
  }

  @Post(':id/reactivate')
  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_MANAGE)
  async reactivateAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Req() req: Request,
  ) {
    const admin = await this.adminsService.reactivateAdmin(
      id,
      actor.id,
      extractRequestSecurityMetadata(req),
    );
    return { success: true, data: admin };
  }

  @Post(':id/revoke-sessions')
  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_MANAGE)
  async revokeSessions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Req() req: Request,
  ) {
    const data = await this.adminsService.revokeSessions(
      id,
      actor.id,
      extractRequestSecurityMetadata(req),
    );
    return { success: true, data };
  }

  @Post(':id/reset-password')
  @RequireAdminPermission(ADMIN_PERMISSIONS.ADMIN_MANAGE)
  async resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetAdminPasswordDto,
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Req() req: Request,
  ) {
    const data = await this.adminsService.resetPassword(
      id,
      dto,
      actor.id,
      extractRequestSecurityMetadata(req),
    );
    return { success: true, data };
  }
}
