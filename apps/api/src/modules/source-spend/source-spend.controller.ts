import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS, type PermissionKey } from '@crmpro/shared/auth';
import {
  PermissionsGuard,
  PermissionsService,
  RequirePermission,
} from '../../common/auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { SaveSourceSpendDto } from './dto/save-source-spend.dto';
import { SourceSpendQueryDto } from './dto/source-spend-query.dto';
import { SourceSpendService } from './source-spend.service';

/** Marketing spend per lead source and month (workflow spec §2.7). */
@Controller('source-spend')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SourceSpendController {
  constructor(
    private readonly spend: SourceSpendService,
    private readonly permissions: PermissionsService,
  ) {}

  /** Readable by whoever enters spend (spend.manage) or reads analytics. */
  @Get()
  async getGrid(
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: { permissionKeys?: Set<PermissionKey> },
    @Query() query: SourceSpendQueryDto,
  ) {
    const keys =
      request.permissionKeys ??
      (await this.permissions.getPermissionKeysForUser(user.id, user.tenantId));
    if (
      !keys.has(PERMISSIONS.SPEND_MANAGE) &&
      !keys.has(PERMISSIONS.ANALYTICS_READ)
    ) {
      throw new ForbiddenException('Insufficient permissions');
    }
    const data = await this.spend.getGrid(user.tenantId, query);
    return { success: true, data };
  }

  @Put()
  @RequirePermission(PERMISSIONS.SPEND_MANAGE)
  async save(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveSourceSpendDto,
  ) {
    const data = await this.spend.save(user, dto);
    return { success: true, data };
  }
}
