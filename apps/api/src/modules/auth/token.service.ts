import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import ms, { StringValue } from 'ms';
import { PasswordService } from '../../common/security/password.service';
import type { AccessTokenPayload } from './types/jwt-payload.type';

export type { AccessTokenPayload } from './types/jwt-payload.type';

const REFRESH_TOKEN_SEPARATOR = '.';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly passwordService: PasswordService,
  ) {}

  generateAccessToken(
    user: { id: string; tenantId: string; roleId: string },
    sessionId: string,
  ): string {
    const payload: AccessTokenPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      roleId: user.roleId,
      sessionId,
    };

    return this.jwtService.sign(payload);
  }

  generateRawRefreshSecret(): string {
    return randomBytes(64).toString('hex');
  }

  formatRefreshToken(sessionId: string, rawSecret: string): string {
    return `${sessionId}${REFRESH_TOKEN_SEPARATOR}${rawSecret}`;
  }

  parseRefreshToken(
    refreshToken: string,
  ): { sessionId: string; rawSecret: string } | null {
    const separatorIndex = refreshToken.indexOf(REFRESH_TOKEN_SEPARATOR);
    if (separatorIndex === -1) {
      return null;
    }

    const sessionId = refreshToken.slice(0, separatorIndex);
    const rawSecret = refreshToken.slice(separatorIndex + 1);

    if (!sessionId || !rawSecret) {
      return null;
    }

    return { sessionId, rawSecret };
  }

  async hashRefreshToken(rawSecret: string): Promise<string> {
    return this.passwordService.hash(rawSecret);
  }

  async verifyRefreshToken(rawSecret: string, hash: string): Promise<boolean> {
    return this.passwordService.verify(hash, rawSecret);
  }

  getRefreshTokenExpiresAt(): Date {
    const duration = ms(
      this.configService.getOrThrow<string>(
        'auth.refreshTokenExpiration',
      ) as StringValue,
    );

    if (duration === undefined) {
      throw new Error('Invalid REFRESH_TOKEN_EXPIRATION');
    }

    return new Date(Date.now() + duration);
  }
}
