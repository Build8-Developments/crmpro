import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditWriterService } from '../audit/audit-writer.service';

export const API_KEY_PREFIX = 'crm_live_';
const DISPLAY_PREFIX_LENGTH = API_KEY_PREFIX.length + 6;

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

const apiKeySelect = {
  id: true,
  name: true,
  prefix: true,
  lastUsedAt: true,
  revokedAt: true,
  createdAt: true,
  createdBy: { select: { id: true, name: true } },
} as const;

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async list(tenantId: string) {
    const items = await this.prisma.apiKey.findMany({
      where: { tenantId },
      orderBy: [
        { revokedAt: { sort: 'desc', nulls: 'first' } },
        { createdAt: 'desc' },
      ],
      select: apiKeySelect,
    });

    return { items };
  }

  /** The raw key is returned exactly once; only its hash is stored. */
  async create(tenantId: string, actorUserId: string, name: string) {
    const rawKey = `${API_KEY_PREFIX}${randomBytes(24).toString('base64url')}`;

    const key = await this.prisma.$transaction(async (tx) => {
      const created = await tx.apiKey.create({
        data: {
          tenantId,
          name,
          prefix: rawKey.slice(0, DISPLAY_PREFIX_LENGTH),
          keyHash: hashApiKey(rawKey),
          createdByUserId: actorUserId,
        },
        select: apiKeySelect,
      });

      await this.auditWriter.createAuditLog({
        tenantId,
        actorUserId,
        action: 'API_KEY_CREATED',
        entityType: 'ApiKey',
        entityId: created.id,
        metadata: { name, prefix: created.prefix },
        tx,
      });

      return created;
    });

    return { ...key, apiKey: rawKey };
  }

  async revoke(tenantId: string, actorUserId: string, id: string) {
    const existing = await this.prisma.apiKey.findFirst({
      where: { id, tenantId, revokedAt: null },
      select: { id: true, name: true },
    });

    if (!existing) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.apiKey.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      });

      await this.auditWriter.createAuditLog({
        tenantId,
        actorUserId,
        action: 'API_KEY_REVOKED',
        entityType: 'ApiKey',
        entityId: existing.id,
        metadata: { name: existing.name },
        tx,
      });
    });

    return { id: existing.id };
  }

  /** Resolves an active key to its tenant; updates lastUsedAt (best effort). */
  async authenticate(
    rawKey: string,
  ): Promise<{ id: string; tenantId: string } | null> {
    if (!rawKey.startsWith(API_KEY_PREFIX)) {
      return null;
    }

    const key = await this.prisma.apiKey.findUnique({
      where: { keyHash: hashApiKey(rawKey) },
      select: { id: true, tenantId: true, revokedAt: true },
    });

    if (!key || key.revokedAt) {
      return null;
    }

    void this.prisma.apiKey
      .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);

    return { id: key.id, tenantId: key.tenantId };
  }
}
