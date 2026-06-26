import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { TenantStatus, UserSession } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PasswordService } from '../../common/security/password.service';
import { UsersService, UserWithRoleAndTenant } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { TokenService } from './token.service';
import { LoginResult } from './types/login-result.type';
import { LoginSessionMetadata } from './types/login-session-metadata.type';
import { AuthenticatedUser } from './types/jwt-payload.type';
import { RefreshResult } from './types/refresh-result.type';
import { SanitizedUser } from './types/sanitized-user.type';
import { SessionListItem } from './types/session-list-item.type';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async login(
    loginDto: LoginDto,
    sessionMetadata: LoginSessionMetadata,
  ): Promise<LoginResult> {
    const user = await this.validateCredentials(loginDto);
    const rawRefreshSecret = this.tokenService.generateRawRefreshSecret();
    const hashedRefreshToken =
      await this.tokenService.hashRefreshToken(rawRefreshSecret);

    const session = await this.prisma.userSession.create({
      data: {
        userId: user.id,
        hashedRefreshToken,
        expiresAt: this.tokenService.getRefreshTokenExpiresAt(),
        deviceName: sessionMetadata.deviceName,
        ipAddress: sessionMetadata.ipAddress,
        userAgent: sessionMetadata.userAgent,
      },
    });

    const accessToken = this.tokenService.generateAccessToken(
      {
        id: user.id,
        tenantId: user.tenantId,
        roleId: user.roleId,
      },
      session.id,
    );

    const refreshToken = this.tokenService.formatRefreshToken(
      session.id,
      rawRefreshSecret,
    );

    this.logger.log(`Login success for ${user.id}@${loginDto.tenantSlug}`);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async refresh(refreshToken: string): Promise<RefreshResult> {
    const parsed = this.tokenService.parseRefreshToken(refreshToken);
    if (!parsed) {
      this.logger.warn('Refresh rejected: malformed token');
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.prisma.userSession.findUnique({
      where: { id: parsed.sessionId },
    });

    if (!session) {
      this.logger.warn('Refresh rejected: session not found');
      throw new UnauthorizedException('Invalid refresh token');
    }

    this.assertSessionActive(session);

    const tokenValid = await this.tokenService.verifyRefreshToken(
      parsed.rawSecret,
      session.hashedRefreshToken,
    );
    if (!tokenValid) {
      this.logger.warn(`Refresh rejected: invalid token for session ${session.id}`);
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findById(session.userId);
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    this.assertUserAndTenantAllowed(user);

    const newRawSecret = this.tokenService.generateRawRefreshSecret();
    const newHashedRefreshToken =
      await this.tokenService.hashRefreshToken(newRawSecret);

    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { hashedRefreshToken: newHashedRefreshToken },
    });

    const newRefreshToken = this.tokenService.formatRefreshToken(
      session.id,
      newRawSecret,
    );
    const accessToken = this.tokenService.generateAccessToken(
      {
        id: user.id,
        tenantId: user.tenantId,
        roleId: user.roleId,
      },
      session.id,
    );

    this.logger.log(`Refresh success for user ${user.id}, session ${session.id}`);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(authUser: AuthenticatedUser): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: {
        id: authUser.sessionId,
        userId: authUser.id,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    this.logger.log(`Logout for user ${authUser.id}, session ${authUser.sessionId}`);
  }

  async logoutAll(authUser: AuthenticatedUser): Promise<number> {
    const result = await this.prisma.userSession.updateMany({
      where: {
        userId: authUser.id,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    this.logger.log(
      `Logout all for user ${authUser.id}, revoked ${result.count} sessions`,
    );

    return result.count;
  }

  async listSessions(authUser: AuthenticatedUser): Promise<SessionListItem[]> {
    const now = new Date();

    const sessions = await this.prisma.userSession.findMany({
      where: {
        userId: authUser.id,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        deviceName: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return sessions.map((session) => ({
      ...session,
      isCurrent: session.id === authUser.sessionId,
    }));
  }

  async getMe(authUser: AuthenticatedUser): Promise<SanitizedUser> {
    const user = await this.usersService.findById(authUser.id);
    if (!user) {
      throw new UnauthorizedException('Invalid authentication session');
    }

    return this.sanitizeUser(user);
  }

  private assertSessionActive(session: UserSession): void {
    if (session.revokedAt !== null) {
      this.logger.warn(`Revoked session rejected: ${session.id}`);
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.expiresAt <= new Date()) {
      this.logger.warn(`Expired session rejected: ${session.id}`);
      throw new UnauthorizedException('Session expired');
    }
  }

  private assertUserAndTenantAllowed(user: UserWithRoleAndTenant): void {
    if (user.deletedAt !== null || !user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tenant = user.tenant;
    if (!tenant || tenant.deletedAt !== null) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (tenant.status === TenantStatus.SUSPENDED) {
      throw new ForbiddenException('Tenant access suspended');
    }

    if (tenant.status === TenantStatus.CANCELLED) {
      throw new ForbiddenException('Tenant subscription cancelled');
    }
  }

  private async validateCredentials(
    loginDto: LoginDto,
  ): Promise<UserWithRoleAndTenant> {
    const { tenantSlug, email, password } = loginDto;

    this.logger.log(`Login attempt for ${email}@${tenantSlug}`);

    const tenant = await this.usersService.findTenantBySlug(tenantSlug);
    if (!tenant) {
      this.logger.warn(`Failed login for ${email}@${tenantSlug}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (tenant.status === TenantStatus.SUSPENDED) {
      this.logger.warn(`Login blocked for suspended tenant: ${tenantSlug}`);
      throw new ForbiddenException('Tenant access suspended');
    }

    if (tenant.status === TenantStatus.CANCELLED) {
      this.logger.warn(`Login blocked for cancelled tenant: ${tenantSlug}`);
      throw new ForbiddenException('Tenant subscription cancelled');
    }

    const user = await this.usersService.findByTenantAndEmail(tenantSlug, email);
    if (!user || user.deletedAt !== null || !user.isActive) {
      this.logger.warn(`Failed login for ${email}@${tenantSlug}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await this.passwordService.verify(
      user.passwordHash,
      password,
    );
    if (!passwordValid) {
      this.logger.warn(`Failed login for ${email}@${tenantSlug}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  private sanitizeUser(user: UserWithRoleAndTenant): SanitizedUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      role: {
        id: user.role.id,
        name: user.role.name,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        status: user.tenant.status,
      },
    };
  }
}
