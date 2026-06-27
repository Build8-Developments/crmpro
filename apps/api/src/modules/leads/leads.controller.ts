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
import { PermissionsGuard, RequirePermission } from '../../common/auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { CreateLeadDto } from './dto/create-lead.dto';
import { GetLeadsQueryDto } from './dto/get-leads-query.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadsService } from './leads.service';

@Controller('leads')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.LEAD_READ)
  async listLeads(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetLeadsQueryDto,
  ) {
    const data = await this.leadsService.listLeads(user.tenantId, query);

    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.LEAD_READ)
  async getLead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.leadsService.getLead(id, user.tenantId);

    return { success: true, data };
  }

  @Post()
  @RequirePermission(PERMISSIONS.LEAD_CREATE)
  async createLead(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLeadDto,
  ) {
    const data = await this.leadsService.createLead(user.tenantId, dto);

    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.LEAD_UPDATE)
  async updateLead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    const data = await this.leadsService.updateLead(id, user.tenantId, dto);

    return { success: true, data };
  }
}
