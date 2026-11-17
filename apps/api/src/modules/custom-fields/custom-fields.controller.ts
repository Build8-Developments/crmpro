import {
  Body,
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
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

@Controller('custom-fields')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomFieldsController {
  constructor(private readonly fields: CustomFieldsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.LEAD_READ)
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('includeArchived', new ParseBoolPipe({ optional: true }))
    includeArchived?: boolean,
  ) {
    return {
      success: true,
      data: await this.fields.list(user.tenantId, includeArchived ?? false),
    };
  }

  @Post()
  @RequirePermission(PERMISSIONS.CUSTOM_FIELD_MANAGE)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCustomFieldDto,
  ) {
    return {
      success: true,
      data: await this.fields.create(user.tenantId, user.id, dto),
    };
  }

  @Put('order')
  @RequirePermission(PERMISSIONS.CUSTOM_FIELD_MANAGE)
  async reorder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReorderCustomFieldsDto,
  ) {
    return {
      success: true,
      data: await this.fields.reorder(user.tenantId, dto.ids),
    };
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.CUSTOM_FIELD_MANAGE)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomFieldDto,
  ) {
    return {
      success: true,
      data: await this.fields.update(user.tenantId, user.id, id, dto),
    };
  }

  @Post(':id/archive')
  @RequirePermission(PERMISSIONS.CUSTOM_FIELD_MANAGE)
  async archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return {
      success: true,
      data: await this.fields.setArchived(user.tenantId, user.id, id, true),
    };
  }

  @Post(':id/restore')
  @RequirePermission(PERMISSIONS.CUSTOM_FIELD_MANAGE)
  async restore(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return {
      success: true,
      data: await this.fields.setArchived(user.tenantId, user.id, id, false),
    };
  }
}
