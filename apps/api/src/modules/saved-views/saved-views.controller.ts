import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PERMISSIONS, type PermissionKey } from '@crmpro/shared/auth';
import {
  CurrentPermissionKeys,
  PermissionsGuard,
  RequirePermission,
} from '../../common/auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { SavedViewsService } from './saved-views.service';

class CreateSavedViewDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name: string;

  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  sort?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isShared?: boolean;
}

class UpdateSavedViewDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  sort?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isShared?: boolean;
}

@Controller('saved-views')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermission(PERMISSIONS.LEAD_READ)
export class SavedViewsController {
  constructor(private readonly views: SavedViewsService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      data: await this.views.list(user.tenantId, user.id),
    };
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissionKeys() permissionKeys: ReadonlySet<PermissionKey>,
    @Body() dto: CreateSavedViewDto,
  ) {
    const data = await this.views.create(
      user.tenantId,
      user.id,
      { ...dto, name: dto.name.trim() },
      permissionKeys.has(PERMISSIONS.SAVED_VIEW_SHARE),
    );
    return { success: true, data };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentPermissionKeys() permissionKeys: ReadonlySet<PermissionKey>,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSavedViewDto,
  ) {
    const data = await this.views.update(
      user.tenantId,
      user.id,
      id,
      dto,
      permissionKeys.has(PERMISSIONS.SAVED_VIEW_SHARE),
    );
    return { success: true, data };
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return {
      success: true,
      data: await this.views.remove(user.tenantId, user.id, id),
    };
  }
}
