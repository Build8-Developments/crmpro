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
import { CreatePlanDto } from './dto/create-plan.dto';
import { GetPlansQueryDto } from './dto/get-plans-query.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlansService } from './plans.service';

@Controller('plans')
@UseGuards(JwtAuthGuard, AdminPermissionsGuard)
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @RequireAdminPermission(ADMIN_PERMISSIONS.PLAN_READ)
  async listPlans(@Query() query: GetPlansQueryDto) {
    const data = await this.plansService.listPlans(query);
    return { success: true, data };
  }

  @Get(':id')
  @RequireAdminPermission(ADMIN_PERMISSIONS.PLAN_READ)
  async getPlan(@Param('id', ParseUUIDPipe) id: string) {
    const plan = await this.plansService.getPlanById(id);
    return { success: true, data: plan };
  }

  @Post()
  @RequireAdminPermission(ADMIN_PERMISSIONS.PLAN_CREATE)
  async createPlan(
    @Body() dto: CreatePlanDto,
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Req() req: Request,
  ) {
    const plan = await this.plansService.createPlan(
      dto,
      actor.id,
      extractRequestSecurityMetadata(req),
    );
    return { success: true, data: plan };
  }

  @Patch(':id')
  @RequireAdminPermission(ADMIN_PERMISSIONS.PLAN_UPDATE)
  async updatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlanDto,
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Req() req: Request,
  ) {
    const plan = await this.plansService.updatePlan(
      id,
      dto,
      actor.id,
      extractRequestSecurityMetadata(req),
    );
    return { success: true, data: plan };
  }

  @Post(':id/archive')
  @RequireAdminPermission(ADMIN_PERMISSIONS.PLAN_UPDATE)
  async archivePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Req() req: Request,
  ) {
    const plan = await this.plansService.archivePlan(
      id,
      actor.id,
      extractRequestSecurityMetadata(req),
    );
    return { success: true, data: plan };
  }

  @Post(':id/unarchive')
  @RequireAdminPermission(ADMIN_PERMISSIONS.PLAN_UPDATE)
  async unarchivePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAdmin() actor: AuthenticatedAdmin,
    @Req() req: Request,
  ) {
    const plan = await this.plansService.unarchivePlan(
      id,
      actor.id,
      extractRequestSecurityMetadata(req),
    );
    return { success: true, data: plan };
  }
}
