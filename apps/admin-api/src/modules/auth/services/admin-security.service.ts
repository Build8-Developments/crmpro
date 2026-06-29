import { Injectable } from '@nestjs/common';
import {
  AdminSecurityEventType,
  Prisma,
  SecuritySeverity,
} from '@crmpro/database';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { RequestSecurityMetadata } from '../auth.types';

type PrismaTx = Prisma.TransactionClient;

@Injectable()
export class AdminSecurityService {
  constructor(private readonly prisma: PrismaService) {}

  async logLoginSuccess(
    adminId: string,
    metadata: RequestSecurityMetadata,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.createEvent(
      {
        adminId,
        eventType: AdminSecurityEventType.LOGIN_SUCCESS,
        severity: SecuritySeverity.LOW,
        metadata,
      },
      tx,
    );
  }

  async logLoginFailed(
    adminId: string | null,
    metadata: RequestSecurityMetadata,
    reason?: string,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.createEvent(
      {
        adminId,
        eventType: AdminSecurityEventType.LOGIN_FAILED,
        severity: SecuritySeverity.MEDIUM,
        metadata: { ...metadata, reason },
      },
      tx,
    );
  }

  async logTokenRefresh(
    adminId: string,
    metadata: RequestSecurityMetadata,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.createEvent(
      {
        adminId,
        eventType: AdminSecurityEventType.TOKEN_REFRESH,
        severity: SecuritySeverity.LOW,
        metadata,
      },
      tx,
    );
  }

  async logTokenReuse(
    adminId: string,
    metadata: RequestSecurityMetadata,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.createEvent(
      {
        adminId,
        eventType: AdminSecurityEventType.TOKEN_REUSE,
        severity: SecuritySeverity.CRITICAL,
        metadata,
      },
      tx,
    );
  }

  async logSessionRevoked(
    adminId: string,
    metadata: RequestSecurityMetadata,
    sessionId?: string,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.createEvent(
      {
        adminId,
        eventType: AdminSecurityEventType.SESSION_REVOKED,
        severity: SecuritySeverity.MEDIUM,
        metadata: { ...metadata, sessionId },
      },
      tx,
    );
  }

  async logPasswordChanged(
    adminId: string,
    metadata: RequestSecurityMetadata,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.createEvent(
      {
        adminId,
        eventType: AdminSecurityEventType.PASSWORD_CHANGED,
        severity: SecuritySeverity.HIGH,
        metadata,
      },
      tx,
    );
  }

  async logSuspiciousLogin(
    adminId: string | null,
    metadata: RequestSecurityMetadata,
    reason: string,
    tx?: PrismaTx,
  ): Promise<void> {
    await this.createEvent(
      {
        adminId,
        eventType: AdminSecurityEventType.SUSPICIOUS_LOGIN,
        severity: SecuritySeverity.HIGH,
        metadata: { ...metadata, reason },
      },
      tx,
    );
  }

  private async createEvent(
    input: {
      adminId: string | null;
      eventType: AdminSecurityEventType;
      severity: SecuritySeverity;
      metadata: RequestSecurityMetadata | Record<string, unknown>;
    },
    tx?: PrismaTx,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    const { metadata, ...data } = input;

    await client.adminSecurityEvent.create({
      data: {
        ...data,
        ipAddress: (metadata.ipAddress as string | null | undefined) ?? null,
        userAgent: (metadata.userAgent as string | null | undefined) ?? null,
        fingerprint:
          (metadata.fingerprint as string | null | undefined) ?? null,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }
}
