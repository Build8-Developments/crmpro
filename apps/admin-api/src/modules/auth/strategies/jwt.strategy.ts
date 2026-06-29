import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { AccessTokenPayload, AuthenticatedAdmin } from '../auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('auth.accessSecret'),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedAdmin> {
    if (!this.isValidPayload(payload)) {
      throw new UnauthorizedException('Invalid authentication session');
    }

    const admin = await this.prisma.platformAdmin.findFirst({
      where: {
        id: payload.sub,
        isActive: true,
      },
      select: { id: true, roleId: true },
    });

    if (!admin || admin.roleId !== payload.roleId) {
      throw new UnauthorizedException('Invalid authentication session');
    }

    const session = await this.prisma.adminSession.findUnique({
      where: { id: payload.sessionId },
    });

    if (!session || session.adminId !== payload.sub) {
      throw new UnauthorizedException('Invalid authentication session');
    }

    if (session.revokedAt !== null) {
      throw new UnauthorizedException('Invalid authentication session');
    }

    if (session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Invalid authentication session');
    }

    return {
      id: payload.sub,
      roleId: payload.roleId,
      sessionId: payload.sessionId,
    };
  }

  private isValidPayload(payload: AccessTokenPayload): boolean {
    return (
      typeof payload.sub === 'string' &&
      typeof payload.roleId === 'string' &&
      typeof payload.sessionId === 'string'
    );
  }
}
