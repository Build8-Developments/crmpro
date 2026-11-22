import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS } from '@crmpro/shared/auth';
import {
  CurrentLeadScope,
  type LeadScope,
  PermissionsGuard,
  RequirePermission,
} from '../../common/auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { DealsService } from './deals.service';
import { GetDealsQueryDto } from './dto/get-deals-query.dto';
import {
  CancelDealDto,
  ContractDealDto,
  UpdateDealDto,
} from './dto/update-deal.dto';

/**
 * Deals are created by moving a lead to a Won stage (POST
 * /leads/:id/move-stage with `deal`), never on their own.
 */
@Controller('deals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DealsController {
  constructor(private readonly deals: DealsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.DEAL_READ)
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Query() query: GetDealsQueryDto,
  ) {
    const data = await this.deals.list(user.tenantId, query, scope);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.DEAL_READ)
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.deals.get(user.tenantId, id, scope);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.DEAL_WRITE)
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDealDto,
  ) {
    const data = await this.deals.update(
      user.tenantId,
      user.id,
      id,
      dto,
      scope,
    );
    return { success: true, data };
  }

  @Post(':id/contract')
  @RequirePermission(PERMISSIONS.DEAL_WRITE)
  async contract(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ContractDealDto,
  ) {
    const data = await this.deals.contract(
      user.tenantId,
      user.id,
      id,
      dto,
      scope,
    );
    return { success: true, data };
  }

  /** Cancels the deal; the lead re-opens in the stage it was won from. */
  @Post(':id/cancel')
  @RequirePermission(PERMISSIONS.DEAL_CANCEL)
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentLeadScope() scope: LeadScope,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelDealDto,
  ) {
    const data = await this.deals.cancel(
      user.tenantId,
      user.id,
      id,
      dto,
      scope,
    );
    return { success: true, data };
  }
}
