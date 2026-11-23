import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@crmpro/database';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditWriterService } from '../audit/audit-writer.service';
import {
  API_KEY_AUDIT_ACTIONS,
  API_KEY_AUDIT_ENTITY,
  API_KEY_DISPLAY_PREFIX_LENGTH,
  API_KEY_MAX_LENGTH,
  API_KEY_PREFIX,
  API_KEY_RANDOM_BYTES,
  MAX_ACTIVE_API_KEYS_PER_TENANT,
} from './api-keys.constants';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import type {
  ApiKeySummary,
  AuthenticatedApiKey,
  CreatedApiKey,
} from './types/api-key.types';

/** Keys are high-entropy random strings, so a plain SHA-256 is enough. */
export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

export function generateApiKey(): string {
  return `${API_KEY_PREFIX}${randomBytes(API_KEY_RANDOM_BYTES).toString('base64url')}`;
}

/** Cheap shape check before touching the database. */
export function looksLikeApiKey(value: string): boolean {
  return (
    value.startsWith(API_KEY_PREFIX) &&
    value.length > API_KEY_PREFIX.length &&
    value.length <= API_KEY_MAX_LENGTH
  );
}

const apiKeySelect = {
  id: true,
  name: true,
  prefix: true,
  sourceId: true,
  lastUsedAt: true,
  createdAt: true,
  revokedAt: true,
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.ApiKeySelect;

type ApiKeyRecord = Prisma.ApiKeyGetPayload<{ select: typeof apiKeySelect }>;

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async list(tenantId: string): Promise<{ items: ApiKeySummary[] }> {
    const keys = await this.prisma.apiKey.findMany({
      where: { tenantId },
      orderBy: [
        { revokedAt: { sort: 'desc', nulls: 'first' } },
        { createdAt: 'desc' },
      ],
      select: apiKeySelect,
    });

    const sourceNames = await this.loadSourceNames(
      tenantId,
      keys.map((key) => key.sourceId),
    );

    return { items: keys.map((key) => this.toSummary(key, sourceNames)) };
  }

  /** The raw key is returned exactly once; only its hash is stored. */
  async create(
    tenantId: string,
    actorUserId: string,
    dto: CreateApiKeyDto,
  ): Promise<CreatedApiKey> {
    const name = dto.name.trim();
    const sourceId = dto.sourceId ?? null;
    const sourceNames = await this.loadSourceNames(tenantId, [sourceId]);

    if (sourceId && !sourceNames.has(sourceId)) {
      throw new BadRequestException('Lead source not found');
    }

    const activeCount = await this.prisma.apiKey.count({
      where: { tenantId, revokedAt: null },
    });
    if (activeCount >= MAX_ACTIVE_API_KEYS_PER_TENANT) {
      throw new ConflictException(
        `A workspace can have at most ${MAX_ACTIVE_API_KEYS_PER_TENANT} active API keys. Revoke one you no longer use first.`,
      );
    }

    const rawKey = generateApiKey();
    const created = await this.prisma.$transaction(async (tx) => {
      const key = await tx.apiKey.create({
        data: {
          tenantId,
          name,
          prefix: rawKey.slice(0, API_KEY_DISPLAY_PREFIX_LENGTH),
          keyHash: hashApiKey(rawKey),
          sourceId,
          createdByUserId: actorUserId,
        },
        select: apiKeySelect,
      });

      await this.auditWriter.createAuditLog({
        tenantId,
        actorUserId,
        action: API_KEY_AUDIT_ACTIONS.CREATED,
        entityType: API_KEY_AUDIT_ENTITY,
        entityId: key.id,
        metadata: { name, prefix: key.prefix, sourceId },
        tx,
      });

      return key;
    });

    return { ...this.toSummary(created, sourceNames), apiKey: rawKey };
  }

  /** Revoking twice is harmless: the second call returns the same key. */
  async revoke(
    tenantId: string,
    actorUserId: string,
    id: string,
  ): Promise<ApiKeySummary> {
    const existing = await this.prisma.apiKey.findFirst({
      where: { id, tenantId },
      select: apiKeySelect,
    });

    if (!existing) {
      throw new NotFoundException('API key not found');
    }

    const sourceNames = await this.loadSourceNames(tenantId, [
      existing.sourceId,
    ]);

    if (existing.revokedAt) {
      return this.toSummary(existing, sourceNames);
    }

    const revoked = await this.prisma.$transaction(async (tx) => {
      const key = await tx.apiKey.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
        select: apiKeySelect,
      });

      await this.auditWriter.createAuditLog({
        tenantId,
        actorUserId,
        action: API_KEY_AUDIT_ACTIONS.REVOKED,
        entityType: API_KEY_AUDIT_ENTITY,
        entityId: key.id,
        metadata: { name: key.name, prefix: key.prefix },
        tx,
      });

      return key;
    });

    return this.toSummary(revoked, sourceNames);
  }

  /** Resolves a raw key to an active key, or null (unknown or revoked). */
  async findActiveKey(rawKey: string): Promise<AuthenticatedApiKey | null> {
    if (!looksLikeApiKey(rawKey)) {
      return null;
    }

    const key = await this.prisma.apiKey.findUnique({
      where: { keyHash: hashApiKey(rawKey) },
      select: {
        id: true,
        tenantId: true,
        name: true,
        sourceId: true,
        lastUsedAt: true,
        revokedAt: true,
      },
    });

    if (!key || key.revokedAt) {
      return null;
    }

    return {
      id: key.id,
      tenantId: key.tenantId,
      name: key.name,
      sourceId: key.sourceId,
      lastUsedAt: key.lastUsedAt,
    };
  }

  /**
   * Records use at most once per `minIntervalMs`, so a busy integration does
   * not write the row on every request. Best effort: never fails the caller.
   */
  async touchLastUsed(
    key: Pick<AuthenticatedApiKey, 'id' | 'lastUsedAt'>,
    now: Date,
    minIntervalMs: number,
  ): Promise<void> {
    const threshold = new Date(now.getTime() - minIntervalMs);
    if (key.lastUsedAt && key.lastUsedAt > threshold) {
      return;
    }

    try {
      await this.prisma.apiKey.updateMany({
        where: {
          id: key.id,
          OR: [{ lastUsedAt: null }, { lastUsedAt: { lt: threshold } }],
        },
        data: { lastUsedAt: now },
      });
    } catch {
      // Usage tracking must never block lead intake.
    }
  }

  private async loadSourceNames(
    tenantId: string,
    sourceIds: Array<string | null>,
  ): Promise<Map<string, string>> {
    const ids = [
      ...new Set(sourceIds.filter((id): id is string => Boolean(id))),
    ];
    if (ids.length === 0) {
      return new Map();
    }

    const sources = await this.prisma.leadSource.findMany({
      where: { tenantId, id: { in: ids } },
      select: { id: true, name: true },
    });

    return new Map(sources.map((source) => [source.id, source.name]));
  }

  private toSummary(
    key: ApiKeyRecord,
    sourceNames: Map<string, string>,
  ): ApiKeySummary {
    const sourceName = key.sourceId ? sourceNames.get(key.sourceId) : null;

    return {
      id: key.id,
      name: key.name,
      prefix: key.prefix,
      source:
        key.sourceId && sourceName
          ? { id: key.sourceId, name: sourceName }
          : null,
      lastUsedAt: key.lastUsedAt,
      createdBy: key.createdBy
        ? { id: key.createdBy.id, name: key.createdBy.name }
        : null,
      createdAt: key.createdAt,
      revokedAt: key.revokedAt,
    };
  }
}
