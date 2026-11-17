import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomFieldEntity, CustomFieldType, Prisma } from '@crmpro/database';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditWriterService } from '../audit/audit-writer.service';
import {
  CustomFieldValidationError,
  mergeCustomFieldValues,
  type CustomFieldValue,
} from './custom-field-values';
import {
  CreateCustomFieldDto,
  UpdateCustomFieldDto,
} from './dto/custom-field.dto';

export const MAX_ACTIVE_CUSTOM_FIELDS = 30;
const OPTION_TYPES: CustomFieldType[] = [
  CustomFieldType.SELECT,
  CustomFieldType.MULTI_SELECT,
];

const fieldSelect = {
  id: true,
  key: true,
  label: true,
  type: true,
  options: true,
  isRequired: true,
  sortOrder: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CustomFieldDefinitionSelect;

function slugifyKey(label: string): string {
  const ascii = label
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);

  // Arabic (or otherwise non-latin) labels get a short random key.
  return /^[a-z]/.test(ascii) && ascii.length >= 2
    ? ascii
    : `field_${randomBytes(3).toString('hex')}`;
}

@Injectable()
export class CustomFieldsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async list(tenantId: string, includeArchived = false) {
    const items = await this.prisma.customFieldDefinition.findMany({
      where: {
        tenantId,
        entity: CustomFieldEntity.LEAD,
        ...(includeArchived ? {} : { archivedAt: null }),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: fieldSelect,
    });

    return { items };
  }

  async create(
    tenantId: string,
    actorUserId: string,
    dto: CreateCustomFieldDto,
  ) {
    this.assertOptions(dto.type, dto.options);

    const activeCount = await this.prisma.customFieldDefinition.count({
      where: { tenantId, entity: CustomFieldEntity.LEAD, archivedAt: null },
    });

    if (activeCount >= MAX_ACTIVE_CUSTOM_FIELDS) {
      throw new BadRequestException(
        `You can have at most ${MAX_ACTIVE_CUSTOM_FIELDS} active custom fields`,
      );
    }

    const key = dto.key ?? slugifyKey(dto.label);
    const clash = await this.prisma.customFieldDefinition.findFirst({
      where: { tenantId, entity: CustomFieldEntity.LEAD, key },
      select: { id: true },
    });

    if (clash) {
      throw new ConflictException(`A field with key "${key}" already exists`);
    }

    return this.prisma.$transaction(async (tx) => {
      const field = await tx.customFieldDefinition.create({
        data: {
          tenantId,
          entity: CustomFieldEntity.LEAD,
          key,
          label: dto.label,
          type: dto.type,
          options: OPTION_TYPES.includes(dto.type)
            ? dto.options
            : Prisma.JsonNull,
          isRequired: dto.isRequired ?? false,
          sortOrder: activeCount,
        },
        select: fieldSelect,
      });

      await this.audit(
        tx,
        tenantId,
        actorUserId,
        'CUSTOM_FIELD_CREATED',
        field.id,
        {
          key,
          type: dto.type,
        },
      );

      return field;
    });
  }

  async update(
    tenantId: string,
    actorUserId: string,
    id: string,
    dto: UpdateCustomFieldDto,
  ) {
    const existing = await this.getOrThrow(tenantId, id);

    if (dto.options !== undefined) {
      this.assertOptions(existing.type, dto.options);
    }

    return this.prisma.$transaction(async (tx) => {
      const field = await tx.customFieldDefinition.update({
        where: { id: existing.id },
        data: {
          ...(dto.label !== undefined ? { label: dto.label } : {}),
          ...(dto.options !== undefined ? { options: dto.options } : {}),
          ...(dto.isRequired !== undefined
            ? { isRequired: dto.isRequired }
            : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        },
        select: fieldSelect,
      });

      await this.audit(
        tx,
        tenantId,
        actorUserId,
        'CUSTOM_FIELD_UPDATED',
        field.id,
        {
          changed: Object.keys(dto),
        },
      );

      return field;
    });
  }

  /** Archived fields disappear from forms; existing values are kept. */
  async setArchived(
    tenantId: string,
    actorUserId: string,
    id: string,
    archived: boolean,
  ) {
    const existing = await this.getOrThrow(tenantId, id);

    if (!archived) {
      const activeCount = await this.prisma.customFieldDefinition.count({
        where: { tenantId, entity: CustomFieldEntity.LEAD, archivedAt: null },
      });
      if (activeCount >= MAX_ACTIVE_CUSTOM_FIELDS) {
        throw new BadRequestException(
          `You can have at most ${MAX_ACTIVE_CUSTOM_FIELDS} active custom fields`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const field = await tx.customFieldDefinition.update({
        where: { id: existing.id },
        data: { archivedAt: archived ? new Date() : null },
        select: fieldSelect,
      });

      await this.audit(
        tx,
        tenantId,
        actorUserId,
        archived ? 'CUSTOM_FIELD_ARCHIVED' : 'CUSTOM_FIELD_RESTORED',
        field.id,
        { key: field.key },
      );

      return field;
    });
  }

  async reorder(tenantId: string, ids: string[]) {
    const fields = await this.prisma.customFieldDefinition.findMany({
      where: { tenantId, id: { in: ids } },
      select: { id: true },
    });

    if (fields.length !== ids.length) {
      throw new BadRequestException('One or more fields not found');
    }

    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.customFieldDefinition.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.list(tenantId);
  }

  /**
   * Validated, merged lead values (throws 400 with per-field details).
   * Only active definitions are accepted for writes.
   */
  async resolveLeadValues(
    tenantId: string,
    existing: Prisma.JsonValue | null,
    submitted: Record<string, unknown> | undefined,
    options: { creating: boolean },
  ): Promise<Record<string, CustomFieldValue> | undefined> {
    const definitions = await this.prisma.customFieldDefinition.findMany({
      where: { tenantId, entity: CustomFieldEntity.LEAD, archivedAt: null },
      select: {
        key: true,
        label: true,
        type: true,
        options: true,
        isRequired: true,
      },
    });

    if (definitions.length === 0 && submitted === undefined) {
      return undefined;
    }

    try {
      return mergeCustomFieldValues(
        definitions,
        existing && typeof existing === 'object' && !Array.isArray(existing)
          ? existing
          : null,
        submitted,
        options,
      );
    } catch (error) {
      if (error instanceof CustomFieldValidationError) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Invalid custom field values',
          details: error.errors,
        });
      }
      throw error;
    }
  }

  private assertOptions(type: CustomFieldType, options: string[] | undefined) {
    if (OPTION_TYPES.includes(type) && (!options || options.length < 1)) {
      throw new BadRequestException('Select fields need at least one option');
    }
  }

  private async getOrThrow(tenantId: string, id: string) {
    const field = await this.prisma.customFieldDefinition.findFirst({
      where: { id, tenantId },
      select: { id: true, type: true },
    });

    if (!field) {
      throw new NotFoundException('Custom field not found');
    }

    return field;
  }

  private audit(
    tx: Prisma.TransactionClient,
    tenantId: string,
    actorUserId: string,
    action: string,
    entityId: string,
    metadata: Record<string, unknown>,
  ) {
    return this.auditWriter.createAuditLog({
      tenantId,
      actorUserId,
      action,
      entityType: 'CustomField',
      entityId,
      metadata,
      tx,
    });
  }
}
