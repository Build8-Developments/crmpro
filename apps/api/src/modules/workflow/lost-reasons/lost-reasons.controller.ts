import {
  Body,
  Controller,
  Delete,
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
import { PermissionsGuard, RequirePermission } from '../../../common/auth';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/types/jwt-payload.type';
import {
  CreateLostReasonDto,
  UpdateLostReasonDto,
} from './dto/lost-reason.dto';
import { LostReasonsService } from './lost-reasons.service';

/** Reading is part of working leads; editing the list is an org setting. */
@Controller('lost-reasons')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LostReasonsController {
  constructor(private readonly lostReasons: LostReasonsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.LEAD_READ)
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
  ) {
    const data = await this.lostReasons.list(
      user.tenantId,
      includeInactive ?? false,
    );
    return { success: true, data };
  }

  @Post()
  @RequirePermission(PERMISSIONS.SETTINGS_MANAGE)
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLostReasonDto,
  ) {
    const data = await this.lostReasons.create(user.tenantId, dto);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.SETTINGS_MANAGE)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLostReasonDto,
  ) {
    const data = await this.lostReasons.update(user.tenantId, id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.SETTINGS_MANAGE)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.lostReasons.remove(user.tenantId, id);
    return { success: true, data };
  }
}
