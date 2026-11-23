import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomFieldEntity, CustomFieldType, Prisma } from '@crmpro/database';
import { API_ERROR_CODES } from '@crmpro/shared/errors';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditWriterService } from '../audit/audit-writer.service';
import { deriveUniqueCustomFieldKey } from './custom-field-key';
import {
  CustomFieldValidationError,
  customFieldOptions,
  mergeCustomFieldValues,
  type CustomFieldDefinitionLike,
  type RequiredFieldCheck,
  type StoredCustomFields,
} from './custom-field-values';
import {
  CUSTOM_FIELD_AUDIT_ACTIONS,
  CUSTOM_FIELD_AUDIT_ENTITY,
  MAX_ACTIVE_CUSTOM_FIELDS,
  OPTION_FIELD_TYPES,
} from './custom-fields.constants';
import {
  CreateCustomFieldDto,
  ReorderCustomFieldsDto,
  UpdateCustomFieldDto,
} from './dto/custom-field.dto';

const fieldSelect = {
  id: true,
  key: true,
  label: true,
  description: true,
  type: true,
  options: true,
  isRequired: true,
  sortOrder: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CustomFieldDefinitionSelect;

type FieldRecord = Prisma.CustomFieldDefinitionGetPayload<{
  select: typeof fieldSelect;
}>;

const definitionSelect = {
  key: true,
  label: true,
  type: true,
  options: true,
  isRequired: true,
  archivedAt: true,
} satisfies Prisma.CustomFieldDefinitionSelect;

export interface CustomFieldResponse {
  id: string;
  key: string;
  label: string;
  description: string | null;
  type: CustomFieldType;
  /** Choices for SELECT / MULTI_SELECT; null for other types. */
  options: string[] | null;
  isRequired: boolean;
  sortOrder: number;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Definition fields an audit entry records. */
type AuditedField = Pick<
  CustomFieldResponse,
  'label' | 'description' | 'options' | 'isRequired' | 'sortOrder'
>;

const AUDITED_KEYS = [
  'label',
  'description',
  'options',
  'isRequired',
  'sortOrder',
] as const satisfies ReadonlyArray<keyof AuditedField>;

function isOptionType(type: CustomFieldType): boolean {
  return OPTION_FIELD_TYPES.includes(type);
}

function toResponse(record: FieldRecord): CustomFieldResponse {
  return {
    id: record.id,
    key: record.key,
    label: record.label,
    description: record.description,
    type: record.type,
    options: isOptionType(record.type)
      ? customFieldOptions(record.options)
      : null,
    isRequired: record.isRequired,
    sortOrder: record.sortOrder,
    archivedAt: record.archivedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

/** Active fields first (in sortOrder), then archived ones. */
function byDisplayOrder(a: FieldRecord, b: FieldRecord): number {
  if (Boolean(a.archivedAt) !== Boolean(b.archivedAt)) {
    return a.archivedAt ? 1 : -1;
  }
  return (
    a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime()
  );
}

/**
 * Tenant-defined lead fields (settings) and validation of the values leads
 * store in `Lead.customFields`. Definitions are archived, never deleted, so
 * values already on leads stay readable.
 */
@Injectable()
export class CustomFieldsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async list(
    tenantId: string,
    includeArchived = false,
  ): Promise<CustomFieldResponse[]> {
    const records = await this.prisma.customFieldDefinition.findMany({
      where: {
        tenantId,
        entity: CustomFieldEntity.LEAD,
        ...(includeArchived ? {} : { archivedAt: null }),
      },
      select: fieldSelect,
    });
    return records.sort(byDisplayOrder).map(toResponse);
  }

  async create(
    tenantId: string,
    actorUserId: string,
    dto: CreateCustomFieldDto,
  ): Promise<CustomFieldResponse> {
    const options = this.resolveOptions(dto.type, dto.options);
    await this.assertBelowActiveCap(tenantId);

    const existing = await this.prisma.customFieldDefinition.findMany({
      where: { tenantId, entity: CustomFieldEntity.LEAD },
      select: { key: true, sortOrder: true },
    });
    const taken = new Set(existing.map((field) => field.key));

    if (dto.key !== undefined && taken.has(dto.key)) {
      throw new ConflictException(
        `A custom field with the key "${dto.key}" already exists`,
      );
    }
    const key = dto.key ?? deriveUniqueCustomFieldKey(dto.label, taken);
    const sortOrder =
      existing.reduce((max, field) => Math.max(max, field.sortOrder), -1) + 1;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const record = await tx.customFieldDefinition.create({
          data: {
            tenantId,
            entity: CustomFieldEntity.LEAD,
            key,
            label: dto.label,
            description: dto.description ?? null,
            type: dto.type,
            options: options ?? Prisma.DbNull,
            isRequired: dto.isRequired ?? false,
            sortOrder,
          },
          select: fieldSelect,
        });

        await this.auditWriter.createAuditLog({
          tenantId,
          actorUserId,
          action: CUSTOM_FIELD_AUDIT_ACTIONS.CREATED,
          entityType: CUSTOM_FIELD_AUDIT_ENTITY,
          entityId: record.id,
          metadata: {
            key,
            label: record.label,
            type: record.type,
            isRequired: record.isRequired,
            ...(options ? { options } : {}),
          },
          tx,
        });

        return toResponse(record);
      });
    } catch (error) {
      throw this.mapUniqueError(error, key);
    }
  }

  async update(
    tenantId: string,
    actorUserId: string,
    id: string,
    dto: UpdateCustomFieldDto,
  ): Promise<CustomFieldResponse> {
    const before = toResponse(await this.getOrThrow(tenantId, id));

    if (dto.options !== undefined && !isOptionType(before.type)) {
      throw new BadRequestException('Only select fields have options');
    }
    const options =
      dto.options !== undefined
        ? this.resolveOptions(before.type, dto.options)
        : undefined;

    const next: AuditedField = {
      label: dto.label ?? before.label,
      description:
        dto.description !== undefined ? dto.description : before.description,
      options: options ?? before.options,
      isRequired: dto.isRequired ?? before.isRequired,
      sortOrder: dto.sortOrder ?? before.sortOrder,
    };

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of AUDITED_KEYS) {
      if (JSON.stringify(before[key]) !== JSON.stringify(next[key])) {
        changes[key] = { from: before[key], to: next[key] };
      }
    }
    if (Object.keys(changes).length === 0) return before;

    return this.prisma.$transaction(async (tx) => {
      const record = await tx.customFieldDefinition.update({
        where: { id: before.id },
        data: {
          label: next.label,
          description: next.description,
          isRequired: next.isRequired,
          sortOrder: next.sortOrder,
          ...(options ? { options } : {}),
        },
        select: fieldSelect,
      });

      await this.auditWriter.createAuditLog({
        tenantId,
        actorUserId,
        action: CUSTOM_FIELD_AUDIT_ACTIONS.UPDATED,
        entityType: CUSTOM_FIELD_AUDIT_ENTITY,
        entityId: record.id,
        metadata: { key: record.key, changes },
        tx,
      });

      return toResponse(record);
    });
  }

  /**
   * Archived fields leave forms, exports and the import wizard; values leads
   * already have are kept (and shown greyed in the lead drawer).
   */
  async archive(
    tenantId: string,
    actorUserId: string,
    id: string,
  ): Promise<CustomFieldResponse> {
    const field = await this.getOrThrow(tenantId, id);
    if (field.archivedAt) return toResponse(field);
    return this.setArchivedAt(tenantId, actorUserId, field, new Date());
  }

  async restore(
    tenantId: string,
    actorUserId: string,
    id: string,
  ): Promise<CustomFieldResponse> {
    const field = await this.getOrThrow(tenantId, id);
    if (!field.archivedAt) return toResponse(field);
    await this.assertBelowActiveCap(tenantId);
    return this.setArchivedAt(tenantId, actorUserId, field, null);
  }

  /** `ids` in their new order; fields not listed keep their sortOrder. */
  async reorder(
    tenantId: string,
    actorUserId: string,
    dto: ReorderCustomFieldsDto,
  ): Promise<CustomFieldResponse[]> {
    const fields = await this.prisma.customFieldDefinition.findMany({
      where: {
        tenantId,
        entity: CustomFieldEntity.LEAD,
        id: { in: dto.ids },
      },
      select: { id: true, key: true },
    });
    if (fields.length !== dto.ids.length) {
      throw new NotFoundException('Custom field not found');
    }
    const keyById = new Map(fields.map((field) => [field.id, field.key]));

    await this.prisma.$transaction(async (tx) => {
      for (const [index, id] of dto.ids.entries()) {
        await tx.customFieldDefinition.update({
          where: { id },
          data: { sortOrder: index },
        });
      }
      await this.auditWriter.createAuditLog({
        tenantId,
        actorUserId,
        action: CUSTOM_FIELD_AUDIT_ACTIONS.REORDERED,
        entityType: CUSTOM_FIELD_AUDIT_ENTITY,
        entityId: null,
        metadata: { order: dto.ids.map((id) => keyById.get(id)) },
        tx,
      });
    });

    return this.list(tenantId, true);
  }

  /** Every lead field definition, archived ones included (for validation). */
  async getLeadDefinitions(
    tenantId: string,
  ): Promise<CustomFieldDefinitionLike[]> {
    return this.prisma.customFieldDefinition.findMany({
      where: { tenantId, entity: CustomFieldEntity.LEAD },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: definitionSelect,
    });
  }

  /**
   * Validated values merged into what the lead already stores (see
   * mergeCustomFieldValues). Throws 400 VALIDATION_ERROR with
   * `details.customFields` = { key: message }.
   */
  resolveLeadValues(params: {
    definitions: readonly CustomFieldDefinitionLike[];
    existing: unknown;
    submitted: Record<string, unknown> | undefined;
    required: RequiredFieldCheck;
  }): StoredCustomFields {
    try {
      return mergeCustomFieldValues(params);
    } catch (error) {
      if (error instanceof CustomFieldValidationError) {
        throw new BadRequestException({
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: error.message,
          details: { customFields: error.errors },
        });
      }
      throw error;
    }
  }

  private async setArchivedAt(
    tenantId: string,
    actorUserId: string,
    field: FieldRecord,
    archivedAt: Date | null,
  ): Promise<CustomFieldResponse> {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.customFieldDefinition.update({
        where: { id: field.id },
        data: { archivedAt },
        select: fieldSelect,
      });

      await this.auditWriter.createAuditLog({
        tenantId,
        actorUserId,
        action: archivedAt
          ? CUSTOM_FIELD_AUDIT_ACTIONS.ARCHIVED
          : CUSTOM_FIELD_AUDIT_ACTIONS.RESTORED,
        entityType: CUSTOM_FIELD_AUDIT_ENTITY,
        entityId: record.id,
        metadata: { key: record.key, label: record.label },
        tx,
      });

      return toResponse(record);
    });
  }

  /** Select types need at least one option; other types store none. */
  private resolveOptions(
    type: CustomFieldType,
    options: string[] | undefined,
  ): string[] | null {
    if (!isOptionType(type)) return null;
    if (!options || options.length === 0) {
      throw new BadRequestException('Add at least one option');
    }
    return options;
  }

  private async assertBelowActiveCap(tenantId: string): Promise<void> {
    const active = await this.prisma.customFieldDefinition.count({
      where: { tenantId, entity: CustomFieldEntity.LEAD, archivedAt: null },
    });
    if (active >= MAX_ACTIVE_CUSTOM_FIELDS) {
      throw new BadRequestException(
        `You can have at most ${MAX_ACTIVE_CUSTOM_FIELDS} active custom fields. Archive one first.`,
      );
    }
  }

  private async getOrThrow(tenantId: string, id: string): Promise<FieldRecord> {
    const record = await this.prisma.customFieldDefinition.findFirst({
      where: { id, tenantId, entity: CustomFieldEntity.LEAD },
      select: fieldSelect,
    });
    if (!record) throw new NotFoundException('Custom field not found');
    return record;
  }

  private mapUniqueError(error: unknown, key: string): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException(
        `A custom field with the key "${key}" already exists`,
      );
    }
    return error;
  }
}
