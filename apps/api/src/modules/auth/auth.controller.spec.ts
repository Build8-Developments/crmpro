import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { PermissionsService } from '../../common/auth/services/permissions.service';
import { RateLimitGuard } from '../../common/rate-limit/rate-limit.guard';
import { REFRESH_COOKIE_NAME } from './constants/auth-cookie.constants';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController cookie transport', () => {
  let controller: AuthController;
  let authService: {
    login: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
    logoutAll: jest.Mock;
  };
  let response: {
    cookie: jest.Mock;
    clearCookie: jest.Mock;
  };

  const user = {
    id: 'user-1',
    tenantId: 'tenant-1',
    roleId: 'role-1',
    sessionId: 'session-1',
  };

  const sanitizedUser = {
    id: 'user-1',
    name: 'Owner',
    email: 'owner@example.com',
    phone: null,
    isActive: true,
    lastLoginAt: null,
    role: { id: 'role-1', name: 'Owner' },
    tenant: {
      id: 'tenant-1',
      name: 'Demo',
      slug: 'demo',
      status: 'ACTIVE',
    },
  };

  beforeEach(async () => {
    authService = {
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
      logoutAll: jest.fn(),
    };
    response = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: PermissionsService,
          useValue: { getUserAuthorization: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'workspaces.urlTemplate'
                ? 'https://{slug}.nomow.app'
                : 'development',
            ),
            getOrThrow: jest.fn().mockReturnValue('7d'),
          },
        },
      ],
    })
      .overrideGuard(RateLimitGuard)
      .useValue({
        canActivate: jest.fn().mockResolvedValue(true),
      })
      .compile();

    controller = module.get(AuthController);
  });

  describe('login', () => {
    it('sets refresh cookie and returns access token without refresh in body', async () => {
      authService.login.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'session-1.secret',
        user: sanitizedUser,
      });

      const result = await controller.login(
        {
          tenantSlug: 'demo',
          email: 'owner@example.com',
          password: 'Password1',
        },
        {
          headers: {},
          ip: '127.0.0.1',
          socket: { remoteAddress: '127.0.0.1' },
        } as unknown as Request,
        response as unknown as Response,
      );

      expect(response.cookie).toHaveBeenCalledWith(
        REFRESH_COOKIE_NAME,
        'session-1.secret',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/api/v1/auth',
        }),
      );
      expect(result).toEqual({
        success: true,
        message: 'Login successful',
        data: {
          accessToken: 'access-token',
          user: sanitizedUser,
        },
      });
      expect(result.data).not.toHaveProperty('refreshToken');
    });
  });

  describe('login from a workspace host', () => {
    const request = (origin: string) =>
      ({
        headers: { origin },
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
      }) as unknown as Request;
    const credentials = (tenantSlug: string) => ({
      tenantSlug,
      email: 'owner@example.com',
      password: 'Password1',
    });

    it('signs in to the workspace whose host sent the request', async () => {
      authService.login.mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'session-1.b',
        user: sanitizedUser,
      });

      await controller.login(
        credentials('acme-x7k2'),
        request('https://acme-x7k2.nomow.app'),
        response as unknown as Response,
      );

      expect(authService.login).toHaveBeenCalled();
    });

    it("refuses to sign in to another workspace from this one's host", async () => {
      await expect(
        controller.login(
          credentials('other-a1b2'),
          request('https://acme-x7k2.nomow.app'),
          response as unknown as Response,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(authService.login).not.toHaveBeenCalled();
      expect(response.cookie).not.toHaveBeenCalled();
    });

    it('does not bind requests from the apex or other origins', async () => {
      authService.login.mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'session-1.b',
        user: sanitizedUser,
      });

      await controller.login(
        credentials('acme-x7k2'),
        request('https://nomow.app'),
        response as unknown as Response,
      );

      expect(authService.login).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('reads refresh token from cookie, rotates cookie, and returns access token only', async () => {
      authService.refresh.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'session-1.new-secret',
      });

      const result = await controller.refresh(
        {
          headers: {},
          cookies: { [REFRESH_COOKIE_NAME]: 'session-1.secret' },
        } as unknown as Request,
        response as unknown as Response,
      );

      expect(authService.refresh).toHaveBeenCalledWith('session-1.secret', {
        workspaceSlug: null,
      });
      expect(response.cookie).toHaveBeenCalledWith(
        REFRESH_COOKIE_NAME,
        'session-1.new-secret',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result).toEqual({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: 'new-access-token',
        },
      });
      expect(result.data).not.toHaveProperty('refreshToken');
    });

    it('passes the workspace host the browser called from', async () => {
      authService.refresh.mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'session-1.b',
      });

      await controller.refresh(
        {
          headers: { origin: 'https://demo-x7k2.nomow.app' },
          cookies: { [REFRESH_COOKIE_NAME]: 'session-1.secret' },
        } as unknown as Request,
        response as unknown as Response,
      );

      expect(authService.refresh).toHaveBeenCalledWith('session-1.secret', {
        workspaceSlug: 'demo-x7k2',
      });
    });

    it('rejects refresh when cookie is missing', async () => {
      await expect(
        controller.refresh(
          { cookies: {} } as unknown as Request,
          response as unknown as Response,
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(authService.refresh).not.toHaveBeenCalled();
      expect(response.cookie).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('revokes session and clears refresh cookie', async () => {
      authService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(
        user,
        response as unknown as Response,
      );

      expect(authService.logout).toHaveBeenCalledWith(user);
      expect(response.clearCookie).toHaveBeenCalledWith(
        REFRESH_COOKIE_NAME,
        expect.objectContaining({
          httpOnly: true,
          path: '/api/v1/auth',
        }),
      );
      expect(result).toEqual({
        success: true,
        message: 'Logged out successfully',
      });
    });
  });

  describe('logout-all', () => {
    it('revokes all sessions and clears refresh cookie', async () => {
      authService.logoutAll.mockResolvedValue(3);

      const result = await controller.logoutAll(
        user,
        response as unknown as Response,
      );

      expect(authService.logoutAll).toHaveBeenCalledWith(user);
      expect(response.clearCookie).toHaveBeenCalledWith(
        REFRESH_COOKIE_NAME,
        expect.objectContaining({
          httpOnly: true,
          path: '/api/v1/auth',
        }),
      );
      expect(result).toEqual({
        success: true,
        message: 'Logged out from all devices',
        revokedSessions: 3,
      });
    });
  });
});
