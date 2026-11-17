import { Injectable } from '@nestjs/common';
import { Prisma, UserTokenType } from '@crmpro/database';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

export function hashUserToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

export interface ConsumedUserToken {
  id: string;
  tenantId: string;
  userId: string;
}

/**
 * Single-use, expiring tokens (password reset, invitations). Raw tokens are
 * 256-bit random values that only ever appear in the emailed link; the
 * database stores a SHA-256 hash, so a leaked table cannot be replayed.
 */
@Injectable()
export class UserTokensService {
  constructor(private readonly prisma: PrismaService) {}

  /** Issues a new token and invalidates older unused ones of the same type. */
  async issue(params: {
    tenantId: string;
    userId: string;
    type: UserTokenType;
    ttlMs: number;
    tx?: Prisma.TransactionClient;
  }): Promise<string> {
    const client = params.tx ?? this.prisma;
    const rawToken = randomBytes(32).toString('base64url');
    const now = new Date();

    await client.userToken.updateMany({
      where: { userId: params.userId, type: params.type, usedAt: null },
      data: { usedAt: now },
    });

    await client.userToken.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        type: params.type,
        tokenHash: hashUserToken(rawToken),
        expiresAt: new Date(now.getTime() + params.ttlMs),
      },
    });

    return rawToken;
  }

  /** Looks a token up without using it (e.g. to render the invite page). */
  async peek(
    rawToken: string,
    type: UserTokenType,
  ): Promise<ConsumedUserToken | null> {
    return this.prisma.userToken.findFirst({
      where: {
        tokenHash: hashUserToken(rawToken),
        type,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, tenantId: true, userId: true },
    });
  }

  /**
   * Atomically marks a valid token as used. Returns null when the token is
   * unknown, expired or already used — callers answer with one generic error.
   */
  async consume(
    rawToken: string,
    type: UserTokenType,
    tx: Prisma.TransactionClient,
  ): Promise<ConsumedUserToken | null> {
    const tokenHash = hashUserToken(rawToken);
    const claimed = await tx.userToken.updateMany({
      where: { tokenHash, type, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });

    if (claimed.count !== 1) {
      return null;
    }

    return tx.userToken.findUnique({
      where: { tokenHash },
      select: { id: true, tenantId: true, userId: true },
    });
  }

  /** True if a token of this type was issued for the user very recently. */
  async issuedWithin(
    userId: string,
    type: UserTokenType,
    windowMs: number,
  ): Promise<boolean> {
    const recent = await this.prisma.userToken.findFirst({
      where: {
        userId,
        type,
        createdAt: { gt: new Date(Date.now() - windowMs) },
      },
      select: { id: true },
    });

    return recent !== null;
  }
}
