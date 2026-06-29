import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { PermissionsGuard, RequirePermission } from '../../common/auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { RolesService } from './roles.service';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermission(PERMISSIONS.USER_READ)
  async listRoles(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.rolesService.listRoles(user.tenantId);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.USER_READ)
  async getRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.rolesService.getRole(user.tenantId, id);
    return { success: true, data };
  }

  @Post()
  @RequirePermission(PERMISSIONS.ROLE_MANAGE)
  async createRole(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRoleDto,
  ) {
    const data = await this.rolesService.createRole(
      user.tenantId,
      user.id,
      dto,
    );
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.ROLE_MANAGE)
  async updateRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    const data = await this.rolesService.updateRole(
      user.tenantId,
      user.id,
      id,
      dto,
    );
    return { success: true, data };
  }

  @Patch(':id/permissions')
  @RequirePermission(PERMISSIONS.ROLE_MANAGE)
  async updateRolePermissions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    const data = await this.rolesService.updateRolePermissions(
      user.tenantId,
      user.id,
      id,
      dto,
    );
    return { success: true, data };
  }

  @Post(':id/archive')
  @RequirePermission(PERMISSIONS.ROLE_MANAGE)
  async archiveRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.rolesService.archiveRole(
      user.tenantId,
      user.id,
      id,
    );
    return { success: true, data };
  }
}
