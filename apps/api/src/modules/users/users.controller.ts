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
import { CheckEmailDto } from './dto/check-email.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UsersService } from './users.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { UserInvitationsService } from './services/user-invitations.service';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly invitations: UserInvitationsService,
  ) {}

  @Get()
  @RequirePermission(PERMISSIONS.USER_READ)
  async listUsers(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetUsersQueryDto,
  ) {
    const data = await this.usersService.listUsers(user.tenantId, query);
    return { success: true, data };
  }

  @Get('quota')
  @RequirePermission(PERMISSIONS.USER_READ)
  async getUserQuota(@CurrentUser() user: AuthenticatedUser) {
    const data = await this.usersService.getUserQuota(user.tenantId);
    return { success: true, data };
  }

  @Get('check-email')
  @RequirePermission(PERMISSIONS.USER_CREATE)
  async checkEmail(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CheckEmailDto,
  ) {
    const available = await this.usersService.checkEmailAvailable(
      user.tenantId,
      query.email,
    );
    return { success: true, data: { available } };
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.USER_READ)
  async getUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.usersService.getUser(user.tenantId, id);
    return { success: true, data };
  }

  @Post()
  @RequirePermission(PERMISSIONS.USER_CREATE)
  async createUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateUserDto,
  ) {
    const data = await this.usersService.createUser(
      user.tenantId,
      user.id,
      dto,
    );
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.USER_UPDATE)
  async updateUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    const data = await this.usersService.updateUser(
      user.tenantId,
      user.id,
      id,
      dto,
    );
    return { success: true, data };
  }

  @Patch(':id/role')
  @RequirePermission(PERMISSIONS.USER_UPDATE)
  async updateUserRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    const data = await this.usersService.updateUserRole(
      user.tenantId,
      user.id,
      id,
      dto,
    );
    return { success: true, data };
  }

  /** Create the user and email them a link to choose their own password. */
  @Post('invite')
  @RequirePermission(PERMISSIONS.USER_CREATE)
  async inviteUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InviteUserDto,
  ) {
    const data = await this.invitations.inviteUser(user.tenantId, user.id, dto);
    return { success: true, data };
  }

  @Post(':id/resend-invite')
  @RequirePermission(PERMISSIONS.USER_CREATE)
  async resendInvite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.invitations.resendInvite(
      user.tenantId,
      user.id,
      id,
    );
    return { success: true, data };
  }

  @Post(':id/deactivate')
  @RequirePermission(PERMISSIONS.USER_UPDATE)
  async deactivateUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.usersService.deactivateUser(
      user.tenantId,
      user.id,
      id,
    );
    return { success: true, data };
  }

  @Post(':id/reactivate')
  @RequirePermission(PERMISSIONS.USER_UPDATE)
  async reactivateUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.usersService.reactivateUser(
      user.tenantId,
      user.id,
      id,
    );
    return { success: true, data };
  }

  @Post(':id/reset-password')
  @RequirePermission(PERMISSIONS.USER_MANAGE)
  async resetUserPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetUserPasswordDto,
  ) {
    const data = await this.usersService.resetUserPassword(
      user.tenantId,
      user.id,
      id,
      dto,
    );
    return { success: true, data };
  }

  @Post(':id/revoke-sessions')
  @RequirePermission(PERMISSIONS.USER_MANAGE)
  async revokeUserSessions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.usersService.revokeUserSessions(
      user.tenantId,
      user.id,
      id,
    );
    return { success: true, data };
  }
}
