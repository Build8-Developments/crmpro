import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS } from '@crmpro/shared/auth';
import type { Request } from 'express';
import { PermissionsGuard, RequirePermission } from '../../common/auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { CompleteLogoUploadDto } from './dto/complete-logo-upload.dto';
import { RequestLogoUploadDto } from './dto/request-logo-upload.dto';
import { UpdateOrganizationSettingsDto } from './dto/update-organization-settings.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationService } from './organization.service';

/**
 * The signed-in user's organization (tenant). Reading identity and settings is
 * open to every member because settings drive behaviour they see; changing
 * them requires `settings.manage`.
 */
@Controller('organization')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get()
  async getOrganization(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.organizationService.getOrganization(user.tenantId);
    return { success: true, data };
  }

  @Patch()
  @RequirePermission(PERMISSIONS.SETTINGS_MANAGE)
  async updateOrganization(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOrganizationDto,
  ) {
    const data = await this.organizationService.updateOrganization(user, dto);
    return { success: true, data };
  }

  @Get('settings')
  async getSettings(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.organizationService.getSettings(user.tenantId);
    return { success: true, data };
  }

  @Patch('settings')
  @RequirePermission(PERMISSIONS.SETTINGS_MANAGE)
  async updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOrganizationSettingsDto,
  ) {
    const data = await this.organizationService.updateSettings(user, dto);
    return { success: true, data };
  }

  @Post('logo/request-upload')
  @HttpCode(200)
  @RequirePermission(PERMISSIONS.SETTINGS_MANAGE)
  async requestLogoUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestLogoUploadDto,
  ) {
    const data = await this.organizationService.requestLogoUpload(user, dto);
    return { success: true, data };
  }

  @Post('logo/complete-upload')
  @HttpCode(200)
  @RequirePermission(PERMISSIONS.SETTINGS_MANAGE)
  async completeLogoUpload(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CompleteLogoUploadDto,
  ) {
    const data = await this.organizationService.completeLogoUpload(user, dto);
    return { success: true, data };
  }

  @Delete('logo')
  @RequirePermission(PERMISSIONS.SETTINGS_MANAGE)
  async removeLogo(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.organizationService.removeLogo(user);
    return { success: true, data };
  }

  @Get('usage')
  @RequirePermission(PERMISSIONS.SETTINGS_READ)
  async getUsage(@CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    const data = await this.organizationService.getUsage(user.tenantId, {
      // Contract price and payment terms are for whoever manages billing.
      includePricing:
        req.permissionKeys?.has(PERMISSIONS.BILLING_MANAGE) ?? false,
    });
    return { success: true, data };
  }
}
