import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminPermissionsService } from '../../common/auth/services/admin-permissions.service';
import { toListResponseData } from '../../common/http/list-response';
import { AuthService } from './auth.service';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedAdmin } from './auth.types';
import { extractRequestSecurityMetadata } from './utils/request-metadata.util';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly adminPermissionsService: AdminPermissionsService,
  ) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const result = await this.authService.login(
      loginDto,
      extractRequestSecurityMetadata(req, loginDto.deviceName),
    );

    return {
      success: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      admin: result.admin,
    };
  }

  @Post('refresh')
  async refresh(@Body() refreshDto: RefreshDto, @Req() req: Request) {
    const result = await this.authService.refresh(
      refreshDto.refreshToken,
      extractRequestSecurityMetadata(req),
    );

    return {
      success: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentAdmin() admin: AuthenticatedAdmin, @Req() req: Request) {
    await this.authService.logout(
      admin,
      extractRequestSecurityMetadata(req),
    );

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  async logoutAll(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Req() req: Request,
  ) {
    const revokedSessions = await this.authService.logoutAll(
      admin,
      extractRequestSecurityMetadata(req),
    );

    return {
      success: true,
      message: 'Logged out from all devices',
      data: { revokedSessions },
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentAdmin() admin: AuthenticatedAdmin) {
    const profile = await this.authService.getMe(admin);

    return {
      success: true,
      data: profile,
    };
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async listSessions(@CurrentAdmin() admin: AuthenticatedAdmin) {
    const sessions = await this.authService.listSessions(admin);

    return {
      success: true,
      data: toListResponseData(sessions),
    };
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  async revokeSession(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Req() req: Request,
  ) {
    await this.authService.revokeSession(
      admin,
      sessionId,
      extractRequestSecurityMetadata(req),
    );

    return {
      success: true,
      message: 'Session revoked successfully',
    };
  }

  @Get('permissions')
  @UseGuards(JwtAuthGuard)
  async getPermissions(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Req() req: Request,
  ) {
    const authorization =
      await this.adminPermissionsService.getAdminAuthorization(admin.id);

    if (!req.permissionKeys) {
      req.permissionKeys = new Set(authorization.permissions);
    }

    return {
      success: true,
      data: authorization,
    };
  }
}
