import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { PermissionsService } from '../../common/auth/services/permissions.service';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedUser } from './types/jwt-payload.type';
import { extractLoginSessionMetadata } from './utils/request-metadata.util';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const result = await this.authService.login(
      loginDto,
      extractLoginSessionMetadata(req, loginDto.deviceName),
    );

    return {
      success: true,
      message: 'Login successful',
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    };
  }

  @Post('refresh')
  async refresh(@Body() refreshDto: RefreshDto) {
    const result = await this.authService.refresh(refreshDto.refreshToken);

    return {
      success: true,
      message: 'Token refreshed successfully',
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: AuthenticatedUser) {
    await this.authService.logout(user);

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  async logoutAll(@CurrentUser() user: AuthenticatedUser) {
    const revokedSessions = await this.authService.logoutAll(user);

    return {
      success: true,
      message: 'Logged out from all devices',
      revokedSessions,
    };
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  async listSessions(@CurrentUser() user: AuthenticatedUser) {
    const sessions = await this.authService.listSessions(user);

    return {
      success: true,
      data: sessions,
    };
  }

  @Get('permissions')
  @UseGuards(JwtAuthGuard)
  async getPermissions(@CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    const authorization = await this.permissionsService.getUserAuthorization(
      user.id,
      user.tenantId,
    );

    if (!req.permissionKeys) {
      req.permissionKeys = new Set(authorization.permissions);
    }

    return {
      success: true,
      data: authorization,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.authService.getMe(user);

    return {
      success: true,
      data: profile,
    };
  }
}
