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
} from '../../common/auth';
import { CurrentAdmin } from '../auth/decorators/current-admin.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedAdmin } from '../auth/auth.types';
import { extractRequestSecurityMetadata } from '../auth/utils/request-metadata.util';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { GetTenantsQueryDto } from './dto/get-tenants-query.dto';
import { ResetTenantOwnerPasswordDto } from './dto/reset-tenant-owner-password.dto';
import { UpdateTenantDetailsDto } from './dto/update-tenant-details.dto';
import { UpdateTenantOwnerDto } from './dto/update-tenant-owner.dto';
import { TenantsService } from './tenants.service';

@Controller('tenants')
@UseGuards(JwtAuthGuard, AdminPermissionsGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @RequireAdminPermission(ADMIN_PERMISSIONS.TENANT_READ)
  async listTenants(@Query() query: GetTenantsQueryDto) {
    const data = await this.tenantsService.listTenants(query);
    return { success: true, data };
  }

  @Get(':id/usage')
  @RequireAdminPermission(ADMIN_PERMISSIONS.TENANT_READ)
  async getTenantUsage(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.tenantsService.getTenantUsage(id);
    return { success: true, data };
  }

  @Get(':id')
  @RequireAdminPermission(ADMIN_PERMISSIONS.TENANT_READ)
  async getTenant(@Param('id', ParseUUIDPipe) id: string) {
    const tenant = await this.tenantsService.getTenantById(id);
    return { success: true, data: tenant };
  }

  @Post()
  @RequireAdminPermission(ADMIN_PERMISSIONS.TENANT_CREATE)
  async createTenant(
    @Body() dto: CreateTenantDto,
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Req() req: Request,
  ) {
    const data = await this.tenantsService.createTenant(
      dto,
      actor.id,
      extractRequestSecurityMetadata(req),
    );
    return { success: true, data };
  }

  @Post(':id/suspend')
  @RequireAdminPermission(ADMIN_PERMISSIONS.TENANT_SUSPEND)
  async suspendTenant(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Req() req: Request,
  ) {
    const data = await this.tenantsService.suspendTenant(
      id,
      actor.id,
      extractRequestSecurityMetadata(req),
    );
    return { success: true, data };
  }

  @Post(':id/reactivate')
  @RequireAdminPermission(ADMIN_PERMISSIONS.TENANT_SUSPEND)
  async reactivateTenant(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Req() req: Request,
  ) {
    const data = await this.tenantsService.reactivateTenant(
      id,
      actor.id,
      extractRequestSecurityMetadata(req),
    );
    return { success: true, data };
  }

  @Patch(':id/details')
  @RequireAdminPermission(ADMIN_PERMISSIONS.TENANT_UPDATE)
  async updateTenantDetails(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantDetailsDto,
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Req() req: Request,
  ) {
    const data = await this.tenantsService.updateTenantDetails(
      id,
      dto,
      actor.id,
      extractRequestSecurityMetadata(req),
    );
    return { success: true, data };
  }

  @Patch(':id/owner')
  @RequireAdminPermission(ADMIN_PERMISSIONS.TENANT_UPDATE)
  async updateOwner(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantOwnerDto,
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Req() req: Request,
  ) {
    const data = await this.tenantsService.updateOwner(
      id,
      dto,
      actor.id,
      extractRequestSecurityMetadata(req),
    );
    return { success: true, data };
  }

  @Post(':id/reset-owner-password')
  @RequireAdminPermission(ADMIN_PERMISSIONS.TENANT_UPDATE)
  async resetOwnerPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetTenantOwnerPasswordDto,
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Req() req: Request,
  ) {
    const data = await this.tenantsService.resetOwnerPassword(
      id,
      dto,
      actor.id,
      extractRequestSecurityMetadata(req),
    );
    return { success: true, data };
  }

  @Post(':id/revoke-owner-sessions')
  @RequireAdminPermission(ADMIN_PERMISSIONS.TENANT_UPDATE)
  async revokeOwnerSessions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Req() req: Request,
  ) {
    const data = await this.tenantsService.revokeOwnerSessions(
      id,
      actor.id,
      extractRequestSecurityMetadata(req),
    );
    return { success: true, data };
  }
}
