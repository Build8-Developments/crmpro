import {
  Body,
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { PermissionsGuard, RequirePermission } from '../../common/auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { CustomFieldsService } from './custom-fields.service';
import {
  CreateCustomFieldDto,
  ReorderCustomFieldsDto,
  UpdateCustomFieldDto,
} from './dto/custom-field.dto';

/** Reading is part of working leads; editing the definitions is an org setting. */
@Controller('custom-fields')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomFieldsController {
  constructor(private readonly customFields: CustomFieldsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.LEAD_READ)
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('includeArchived', new ParseBoolPipe({ optional: true }))
    includeArchived?: boolean,
  ) {
    const data = await this.customFields.list(
      user.tenantId,
      includeArchived ?? false,
    );
    return { success: true, data };
  }

  @Post()
  @RequirePermission(PERMISSIONS.SETTINGS_MANAGE)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCustomFieldDto,
  ) {
    const data = await this.customFields.create(user.tenantId, user.id, dto);
    return { success: true, data };
  }

  // Declared before `:id` so "order" is never parsed as an id.
  @Patch('order')
  @RequirePermission(PERMISSIONS.SETTINGS_MANAGE)
  async reorder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReorderCustomFieldsDto,
  ) {
    const data = await this.customFields.reorder(user.tenantId, user.id, dto);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.SETTINGS_MANAGE)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomFieldDto,
  ) {
    const data = await this.customFields.update(
      user.tenantId,
      user.id,
      id,
      dto,
    );
    return { success: true, data };
  }

  @Post(':id/archive')
  @RequirePermission(PERMISSIONS.SETTINGS_MANAGE)
  async archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.customFields.archive(user.tenantId, user.id, id);
    return { success: true, data };
  }

  @Post(':id/restore')
  @RequirePermission(PERMISSIONS.SETTINGS_MANAGE)
  async restore(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.customFields.restore(user.tenantId, user.id, id);
    return { success: true, data };
  }
}
