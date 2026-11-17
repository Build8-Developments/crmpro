import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { PermissionsGuard, RequirePermission } from '../../common/auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { CreateTeamDto } from './dto/create-team.dto';
import { SetTeamMembersDto } from './dto/set-team-members.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamsService } from './teams.service';

@Controller('teams')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.TEAM_READ)
  async listTeams(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.teamsService.listTeams(user.tenantId);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.TEAM_READ)
  async getTeam(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.teamsService.getTeam(id, user.tenantId);
    return { success: true, data };
  }

  @Post()
  @RequirePermission(PERMISSIONS.TEAM_MANAGE)
  async createTeam(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTeamDto,
  ) {
    const data = await this.teamsService.createTeam(
      user.tenantId,
      user.id,
      dto,
    );
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.TEAM_MANAGE)
  async updateTeam(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamDto,
  ) {
    const data = await this.teamsService.updateTeam(
      id,
      user.tenantId,
      user.id,
      dto,
    );
    return { success: true, data };
  }

  @Put(':id/members')
  @RequirePermission(PERMISSIONS.TEAM_MANAGE)
  async setMembers(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetTeamMembersDto,
  ) {
    const data = await this.teamsService.setMembers(
      id,
      user.tenantId,
      user.id,
      dto,
    );
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.TEAM_MANAGE)
  async deleteTeam(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.teamsService.deleteTeam(id, user.tenantId, user.id);
    return { success: true, data };
  }
}
