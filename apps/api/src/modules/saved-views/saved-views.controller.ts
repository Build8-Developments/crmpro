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
import { PERMISSIONS } from '@crmpro/shared/auth';
import {
  PermissionsGuard,
  PermissionsService,
  RequirePermission,
} from '../../common/auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { CreateSavedViewDto, UpdateSavedViewDto } from './dto/saved-view.dto';
import { SavedViewsService } from './saved-views.service';

/** Saved lead views. Sharing with the team is for managers (lead.assign). */
@Controller('saved-views')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SavedViewsController {
  constructor(
    private readonly views: SavedViewsService,
    private readonly permissions: PermissionsService,
  ) {}

  private async canShare(user: AuthenticatedUser): Promise<boolean> {
    const keys = await this.permissions.getPermissionKeysForUser(
      user.id,
      user.tenantId,
    );
    return keys.has(PERMISSIONS.LEAD_ASSIGN);
  }

  @Get()
  @RequirePermission(PERMISSIONS.LEAD_READ)
  async list(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.views.list(user.tenantId, user.id);
    return { success: true, data };
  }

  @Post()
  @RequirePermission(PERMISSIONS.LEAD_READ)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSavedViewDto,
  ) {
    const data = await this.views.create(
      user.tenantId,
      user.id,
      dto,
      await this.canShare(user),
    );
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.LEAD_READ)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSavedViewDto,
  ) {
    const data = await this.views.update(
      user.tenantId,
      user.id,
      id,
      dto,
      await this.canShare(user),
    );
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.LEAD_READ)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.views.remove(user.tenantId, user.id, id);
    return { success: true, data };
  }
}
