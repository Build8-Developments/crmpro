import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AdminPermissionsService } from '../../common/auth/services/admin-permissions.service';
import { toListResponseData } from '../../common/http/list-response';
import { RateLimitGuard } from '../../common/rate-limit/rate-limit.guard';
import { AuthRateLimit } from '../../common/rate-limit/rate-limit.decorator';
import { AuthService } from './auth.service';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedAdmin } from './auth.types';
import { extractRequestSecurityMetadata } from './utils/request-metadata.util';
import {
  type AdminRefreshCookieConfig,
  clearAdminRefreshCookie,
  readAdminRefreshCookie,
  setAdminRefreshCookie,
} from './utils/auth-cookie.util';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly adminPermissionsService: AdminPermissionsService,
    private readonly configService: ConfigService,
  ) {}

  private cookieConfig(): AdminRefreshCookieConfig {
    return {
      nodeEnv: this.configService.get<string>('app.nodeEnv') ?? 'development',
      refreshExpiration:
        this.configService.get<string>('auth.refreshExpiration') ?? '30d',
      refreshCookieCrossOrigin:
        this.configService.get<boolean>('auth.refreshCookieCrossOrigin') ??
        false,
    };
  }

  @Post('login')
  @UseGuards(RateLimitGuard)
  @AuthRateLimit('login')
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(
      loginDto,
      extractRequestSecurityMetadata(req, loginDto.deviceName),
    );

    // The refresh token never reaches JavaScript: httpOnly cookie only.
    setAdminRefreshCookie(res, result.refreshToken, this.cookieConfig());

    return {
      success: true,
      accessToken: result.accessToken,
      admin: result.admin,
    };
  }

  @Post('refresh')
  @UseGuards(RateLimitGuard)
  @AuthRateLimit('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = readAdminRefreshCookie(req);
    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    try {
      const result = await this.authService.refresh(
        refreshToken,
        extractRequestSecurityMetadata(req),
      );
      setAdminRefreshCookie(res, result.refreshToken, this.cookieConfig());
      return { success: true, accessToken: result.accessToken };
    } catch (error) {
      // A dead token should not keep being replayed by the browser.
      if (error instanceof UnauthorizedException) {
        clearAdminRefreshCookie(res, this.cookieConfig());
      }
      throw error;
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(admin, extractRequestSecurityMetadata(req));
    clearAdminRefreshCookie(res, this.cookieConfig());

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
    @Res({ passthrough: true }) res: Response,
  ) {
    const revokedSessions = await this.authService.logoutAll(
      admin,
      extractRequestSecurityMetadata(req),
    );
    clearAdminRefreshCookie(res, this.cookieConfig());

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
